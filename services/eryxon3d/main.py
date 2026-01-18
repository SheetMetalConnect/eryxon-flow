"""
Eryxon3D Engine

CAD processing engine using pythonocc-core (OpenCASCADE).
Extracts geometry and PMI/MBD data from STEP, IGES, and BREP files.

Features:
- Geometry extraction (tessellated meshes as base64)
- PMI/MBD extraction from STEP AP242 (dimensions, GD&T, datums)
- Async processing with Supabase realtime updates
- API key authentication
- Thumbnail generation
- Multi-format support (STEP, IGES, BREP)
"""

import os
import hashlib
import tempfile
import logging
import base64
import secrets
import asyncio
import concurrent.futures
from typing import Optional, List
from datetime import datetime
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException, Security, Depends, Request, BackgroundTasks
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from extractor import extract_geometry_and_pmi, ProcessingResult
from supabase_client import (
    is_async_processing_enabled,
    update_pmi_status,
    update_pmi_progress,
    store_pmi_result,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global process executor for isolation
# Max workers = 2 to prevent OOM
process_executor = concurrent.futures.ProcessPoolExecutor(max_workers=2)

# =============================================================================
# Configuration
# =============================================================================

# API Key authentication
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
API_KEYS: List[str] = [k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()]
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "true").lower() == "true"

# CORS configuration
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

# URL domain validation (opt-in for restrictive environments)
# By default, allows all URLs since service is authenticated
# Set ALLOWED_URL_DOMAINS to restrict to specific domains if needed
ALLOWED_URL_DOMAINS_RAW = os.getenv("ALLOWED_URL_DOMAINS", "").strip()
ALLOWED_URL_DOMAINS = [
    d.strip().lower()
    for d in ALLOWED_URL_DOMAINS_RAW.split(",")
    if d.strip()
] if ALLOWED_URL_DOMAINS_RAW else []  # Empty = allow all

# Rate limiting (simple in-memory, use Redis for production)
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "100"))

# =============================================================================
# FastAPI App
# =============================================================================

app = FastAPI(
    title="Eryxon3D Engine",
    description="CAD processing engine - extracts geometry and PMI from STEP, IGES, BREP files",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# =============================================================================
# Authentication
# =============================================================================

def _constant_time_compare(provided: str, stored: str) -> bool:
    """Constant-time string comparison to prevent timing attacks."""
    # Ensure both are encoded to bytes for secrets.compare_digest
    return secrets.compare_digest(provided.encode('utf-8'), stored.encode('utf-8'))


def _validate_url(url: str) -> None:
    """
    Validate URL against allowed domains if configured.

    Only enforces domain restrictions when ALLOWED_URL_DOMAINS is set.
    For self-hosted deployments, this is typically left open since
    the service is already behind API key authentication.
    """
    # Skip validation if no domain restrictions configured
    if not ALLOWED_URL_DOMAINS:
        return

    parsed = urlparse(url)
    hostname = parsed.hostname

    if not hostname:
        raise HTTPException(
            status_code=400,
            detail="Invalid URL: missing hostname"
        )

    # Check against allowed domains
    hostname_lower = hostname.lower()
    is_allowed = any(
        hostname_lower == domain or hostname_lower.endswith('.' + domain)
        for domain in ALLOWED_URL_DOMAINS
    )

    if not is_allowed:
        logger.warning(f"URL domain not in allowlist: {hostname}")
        raise HTTPException(
            status_code=400,
            detail="URL domain not allowed. Check ALLOWED_URL_DOMAINS configuration."
        )


async def verify_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)) -> Optional[str]:
    """Verify API key if authentication is required."""
    if not REQUIRE_AUTH:
        return None

    if not API_KEYS:
        # No API keys configured but auth required - reject all
        logger.warning("REQUIRE_AUTH=true but no API_KEYS configured")
        raise HTTPException(
            status_code=500,
            detail="Server misconfigured: authentication required but no API keys set"
        )

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Include X-API-Key header."
        )

    # Use constant-time comparison to prevent timing attacks
    is_valid = any(_constant_time_compare(api_key, stored_key) for stored_key in API_KEYS)
    if not is_valid:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )

    return api_key

# =============================================================================
# Request/Response Models
# =============================================================================

class ProcessRequest(BaseModel):
    """Request body for CAD processing."""
    file_url: HttpUrl
    file_name: Optional[str] = None
    include_geometry: bool = True
    include_pmi: bool = True
    generate_thumbnail: bool = False
    thumbnail_size: int = 256


class MeshData(BaseModel):
    """Tessellated mesh data."""
    vertices_base64: str  # Float32Array as base64
    normals_base64: str   # Float32Array as base64
    indices_base64: str   # Uint32Array as base64
    vertex_count: int
    face_count: int
    color: List[float]    # RGB 0-1


class BoundingBox(BaseModel):
    """Axis-aligned bounding box."""
    min: List[float]  # [x, y, z]
    max: List[float]  # [x, y, z]
    center: List[float]
    size: List[float]


class GeometryData(BaseModel):
    """Complete geometry data."""
    meshes: List[MeshData]
    bounding_box: BoundingBox
    total_vertices: int
    total_faces: int


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class Tolerance(BaseModel):
    upper: float
    lower: float
    type: str = "bilateral"


class Dimension(BaseModel):
    id: str
    type: str
    value: float
    unit: str = "mm"
    tolerance: Optional[Tolerance] = None
    text: str
    position: Vector3
    leader_points: List[Vector3] = []


class GeometricTolerance(BaseModel):
    """GD&T feature control frame per ASME Y14.5 / ISO 1101."""
    id: str
    type: str  # flatness, straightness, circularity, etc.
    value: float
    unit: str = "mm"
    symbol: str  # Unicode GD&T symbol (⏥, ⏤, ○, etc.)
    modifier: str = ""  # Material modifier: Ⓜ (MMC), Ⓛ (LMC), Ⓢ (RFS), etc.
    zone_modifier: str = ""  # Zone shape: ⌀ for cylindrical
    datum_refs: List[str] = []  # Referenced datums: ["A", "B", "C"]
    text: str  # Full feature control frame text
    position: Vector3


class Datum(BaseModel):
    id: str
    label: str
    position: Vector3


class SurfaceFinish(BaseModel):
    """Surface finish symbol per ISO 1302 / ASME Y14.36."""
    id: str
    type: str = "surface_finish"
    roughness_type: Optional[str] = None  # Ra, Rz, Rmax, etc.
    roughness_value: Optional[float] = None
    roughness_unit: str = "μm"
    machining_allowance: Optional[float] = None
    lay_symbol: Optional[str] = None  # =, ⊥, X, M, C, R, P
    text: str = ""
    position: Vector3


class Note(BaseModel):
    """Text note or annotation."""
    id: str
    type: str = "note"  # note, callout, flag
    text: str
    position: Vector3


class GraphicalPMI(BaseModel):
    """Graphical PMI element (polyline, curve)."""
    id: str
    type: str  # line, arc, spline
    points: List[Vector3] = []


class PMIData(BaseModel):
    """
    Complete PMI/MBD annotation data per STEP AP242.

    Includes semantic PMI (dimensions, GD&T, datums) and
    graphical PMI (curves, notes, surface finish symbols).
    """
    version: str = "1.0"
    dimensions: List[Dimension] = []
    geometric_tolerances: List[GeometricTolerance] = []
    datums: List[Datum] = []
    surface_finishes: List[SurfaceFinish] = []
    notes: List[Note] = []
    graphical_pmi: List[GraphicalPMI] = []


class ProcessResponse(BaseModel):
    """Response body for CAD processing."""
    success: bool
    geometry: Optional[GeometryData] = None
    pmi: Optional[PMIData] = None
    thumbnail_base64: Optional[str] = None
    file_hash: Optional[str] = None
    processing_time_ms: int
    error: Optional[str] = None


# =============================================================================
# Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {
        "status": "healthy",
        "service": "eryxon3d",
        "version": "1.0.0",
        "auth_required": REQUIRE_AUTH,
        "auth_configured": len(API_KEYS) > 0,
    }


@app.get("/info")
async def service_info():
    """Service information and capabilities."""
    return {
        "service": "eryxon3d",
        "version": "1.0.0",
        "supported_formats": ["step", "stp", "iges", "igs", "brep"],
        "capabilities": {
            "geometry_extraction": True,
            "pmi_extraction": True,
            "async_processing": True,
            "thumbnail_generation": True,
        },
        "limits": {
            "max_file_size_mb": MAX_FILE_SIZE_MB,
        }
    }


@app.post("/process", response_model=ProcessResponse)
async def process_cad(
    request: ProcessRequest,
    api_key: Optional[str] = Depends(verify_api_key)
):
    """
    Process a CAD file and extract geometry and/or PMI.

    Downloads the file from the provided URL, processes it using OpenCASCADE,
    and returns tessellated geometry and PMI annotations.

    Args:
        request: Processing options including file URL
        api_key: API key for authentication (if required)

    Returns:
        ProcessResponse with geometry, PMI, and optional thumbnail
    """
    global process_executor
    start_time = datetime.now()

    try:
        logger.info(f"Processing CAD file: {request.file_url}")

        # Validate URL to prevent SSRF attacks
        _validate_url(str(request.file_url))

        # Download the file
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=False) as client:
            response = await client.get(str(request.file_url))

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download file: HTTP {response.status_code}"
                )

            file_content = response.content

        # Check file size
        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {file_size_mb:.1f}MB (max: {MAX_FILE_SIZE_MB}MB)"
            )

        # Calculate file hash for caching
        file_hash = hashlib.sha256(file_content).hexdigest()[:16]

        # Determine file extension
        file_name = request.file_name or "model.step"
        file_ext = file_name.lower().split('.')[-1]

        # Map extensions to temp file suffix
        ext_map = {
            'step': '.step',
            'stp': '.step',
            'iges': '.iges',
            'igs': '.iges',
            'brep': '.brep',
        }
        suffix = ext_map.get(file_ext, '.step')

        # Write to temporary file for processing
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name

        try:
            # Process the file in separate process to isolate crashes
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                process_executor,
                extract_geometry_and_pmi,
                tmp_path,
                request.include_geometry,
                request.include_pmi,
                request.generate_thumbnail,
                request.thumbnail_size,
            )

            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

            # Build response
            response_data = ProcessResponse(
                success=True,
                processing_time_ms=processing_time,
                file_hash=file_hash,
            )

            if result.geometry:
                response_data.geometry = GeometryData(
                    meshes=[
                        MeshData(
                            vertices_base64=m['vertices_base64'],
                            normals_base64=m['normals_base64'],
                            indices_base64=m['indices_base64'],
                            vertex_count=m['vertex_count'],
                            face_count=m['face_count'],
                            color=m['color'],
                        )
                        for m in result.geometry['meshes']
                    ],
                    bounding_box=BoundingBox(
                        min=result.geometry['bounding_box']['min'],
                        max=result.geometry['bounding_box']['max'],
                        center=result.geometry['bounding_box']['center'],
                        size=result.geometry['bounding_box']['size'],
                    ),
                    total_vertices=result.geometry['total_vertices'],
                    total_faces=result.geometry['total_faces'],
                )

            if result.pmi:
                response_data.pmi = PMIData(
                    dimensions=[Dimension(**d) for d in result.pmi.get('dimensions', [])],
                    geometric_tolerances=[GeometricTolerance(**t) for t in result.pmi.get('geometric_tolerances', [])],
                    datums=[Datum(**d) for d in result.pmi.get('datums', [])],
                    surface_finishes=[SurfaceFinish(**sf) for sf in result.pmi.get('surface_finishes', [])],
                    notes=[Note(**n) for n in result.pmi.get('notes', [])],
                    graphical_pmi=[GraphicalPMI(**g) for g in result.pmi.get('graphical_pmi', [])],
                )

            if result.thumbnail_base64:
                response_data.thumbnail_base64 = result.thumbnail_base64

            # Log summary
            pmi_summary = []
            if result.pmi:
                if result.pmi.get('dimensions'):
                    pmi_summary.append(f"{len(result.pmi['dimensions'])} dims")
                if result.pmi.get('geometric_tolerances'):
                    pmi_summary.append(f"{len(result.pmi['geometric_tolerances'])} GD&T")
                if result.pmi.get('datums'):
                    pmi_summary.append(f"{len(result.pmi['datums'])} datums")
                if result.pmi.get('surface_finishes'):
                    pmi_summary.append(f"{len(result.pmi['surface_finishes'])} surface finishes")
                if result.pmi.get('notes'):
                    pmi_summary.append(f"{len(result.pmi['notes'])} notes")

            logger.info(
                f"Processing complete: {result.geometry['total_vertices'] if result.geometry else 0} vertices, "
                f"PMI: {', '.join(pmi_summary) if pmi_summary else 'none'}"
            )

            return response_data

        finally:
            # Clean up temporary file
            os.unlink(tmp_path)

    except concurrent.futures.process.BrokenProcessPool:
        logger.error("Process pool broken (segfault/crash)")
        # Recreate pool
        process_executor.shutdown(wait=False)
        process_executor = concurrent.futures.ProcessPoolExecutor(max_workers=2)

        return ProcessResponse(
            success=False,
            error="CAD engine crashed: File contains invalid geometry causing segfault",
            processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000),
        )

    except HTTPException:
        raise
    except Exception as e:
        # Log full exception details server-side
        logger.exception(f"CAD processing failed: {e}")
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        # Sanitize error message to avoid leaking internal details
        # Map known safe errors, otherwise return generic message
        error_message = "CAD processing failed"
        error_str = str(e).lower()
        if "file" in error_str and ("not found" in error_str or "empty" in error_str):
            error_message = "CAD file not found or empty"
        elif "format" in error_str or "invalid" in error_str or "unsupported" in error_str:
            error_message = "Unsupported or invalid CAD file format"
        elif "timeout" in error_str:
            error_message = "Processing timed out"
        elif "memory" in error_str:
            error_message = "File too complex to process"

        return ProcessResponse(
            success=False,
            error=error_message,
            processing_time_ms=processing_time,
        )


# Legacy endpoint for backwards compatibility
@app.post("/extract", response_model=ProcessResponse)
async def extract_pmi_legacy(
    request: ProcessRequest,
    api_key: Optional[str] = Depends(verify_api_key)
):
    """Legacy endpoint - redirects to /process with PMI only."""
    request.include_geometry = False
    request.include_pmi = True
    return await process_cad(request, api_key)


# =============================================================================
# Async Processing (Supabase Realtime)
# =============================================================================

class AsyncProcessRequest(BaseModel):
    """Request body for async CAD processing."""
    part_id: str  # Supabase part ID to update
    file_url: HttpUrl
    file_name: Optional[str] = None
    include_geometry: bool = True
    include_pmi: bool = True


class AsyncProcessResponse(BaseModel):
    """Response body for async processing request."""
    accepted: bool
    part_id: str
    message: str


async def process_cad_async(
    part_id: str,
    file_url: str,
    file_name: str,
    include_geometry: bool,
    include_pmi: bool,
):
    """
    Background task for async CAD processing.

    Updates parts.metadata directly in Supabase with:
    1. pmi_status = 'processing' at start (with progress updates)
    2. pmi_status = 'complete' + pmi data on success
    3. pmi_status = 'error' + pmi_error on failure
    """
    start_time = datetime.now()

    try:
        logger.info(f"[{part_id}] Starting async processing")

        # Progress: Downloading
        await update_pmi_progress(part_id, 10, "Downloading file")

        # Download the file
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=False) as client:
            response = await client.get(file_url)

            if response.status_code != 200:
                raise Exception(f"Failed to download file: HTTP {response.status_code}")

            file_content = response.content

        # Check file size
        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise Exception(f"File too large: {file_size_mb:.1f}MB (max: {MAX_FILE_SIZE_MB}MB)")

        logger.info(f"[{part_id}] Downloaded {file_size_mb:.1f}MB")

        # Progress: Parsing
        await update_pmi_progress(part_id, 30, "Parsing CAD file")

        # Determine file extension
        file_ext = file_name.lower().split('.')[-1] if file_name else 'step'

        ext_map = {
            'step': '.step',
            'stp': '.step',
            'iges': '.iges',
            'igs': '.iges',
            'brep': '.brep',
        }
        suffix = ext_map.get(file_ext, '.step')

        # Write to temporary file for processing
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name

        try:
            # Progress: Extracting geometry
            if include_geometry:
                await update_pmi_progress(part_id, 50, "Extracting geometry")

            # Progress: Extracting PMI
            if include_pmi:
                await update_pmi_progress(part_id, 70, "Extracting PMI/GD&T")

            # Process the file
            result = extract_geometry_and_pmi(
                tmp_path,
                extract_geometry=include_geometry,
                extract_pmi=include_pmi,
                generate_thumbnail=False,
            )

            # Progress: Storing results
            await update_pmi_progress(part_id, 90, "Storing results")

            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

            # Build geometry stats if available
            geometry_stats = None
            if result.geometry:
                geometry_stats = {
                    'total_vertices': result.geometry.get('total_vertices', 0),
                    'total_faces': result.geometry.get('total_faces', 0),
                    'bounding_box': result.geometry.get('bounding_box'),
                }

            # Store PMI result in Supabase
            if result.pmi:
                await store_pmi_result(part_id, result.pmi, processing_time, geometry_stats)
                logger.info(f"[{part_id}] Completed in {processing_time}ms")
            else:
                # No PMI found but processing succeeded
                await store_pmi_result(part_id, {
                    'version': '1.0',
                    'dimensions': [],
                    'geometric_tolerances': [],
                    'datums': [],
                    'surface_finishes': [],
                    'notes': [],
                    'graphical_pmi': [],
                }, processing_time, geometry_stats)
                logger.info(f"[{part_id}] Completed (no PMI) in {processing_time}ms")

        finally:
            # Clean up temporary file
            os.unlink(tmp_path)

    except Exception as e:
        logger.exception(f"[{part_id}] Processing failed: {e}")
        await update_pmi_status(part_id, 'error', str(e))


@app.post("/process-async", response_model=AsyncProcessResponse)
async def process_cad_async_endpoint(
    request: AsyncProcessRequest,
    background_tasks: BackgroundTasks,
    api_key: Optional[str] = Depends(verify_api_key)
):
    """
    Async CAD processing with Supabase realtime updates.

    This endpoint:
    1. Validates the request
    2. Sets pmi_status = 'processing' in parts.metadata
    3. Returns immediately (HTTP 202 Accepted)
    4. Processes the file in background
    5. Updates parts.metadata with results when done

    Frontend should subscribe to the parts table for realtime updates.
    Status values: 'pending' | 'processing' | 'complete' | 'error'
    """
    # Check if async processing is configured
    if not is_async_processing_enabled():
        raise HTTPException(
            status_code=503,
            detail="Async processing not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )

    # Validate URL
    _validate_url(str(request.file_url))

    # Set initial status
    status_updated = await update_pmi_status(request.part_id, 'processing')
    if not status_updated:
        raise HTTPException(
            status_code=404,
            detail=f"Part not found: {request.part_id}"
        )

    # Queue background processing
    file_name = request.file_name or "model.step"
    background_tasks.add_task(
        process_cad_async,
        request.part_id,
        str(request.file_url),
        file_name,
        request.include_geometry,
        request.include_pmi,
    )

    return AsyncProcessResponse(
        accepted=True,
        part_id=request.part_id,
        message="Processing started. Subscribe to realtime updates for status."
    )


@app.get("/async-status")
async def async_processing_status():
    """Check if async processing is available."""
    return {
        "enabled": is_async_processing_enabled(),
        "message": "Async processing requires SUPABASE_URL and SUPABASE_SERVICE_KEY"
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
