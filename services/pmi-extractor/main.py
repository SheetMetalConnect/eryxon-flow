"""
CAD Processing Service

FastAPI service that processes CAD files (STEP, IGES, etc.) using pythonocc-core.
Extracts both geometry (tessellated meshes) and PMI (dimensions, tolerances, datums).

Features:
- Full geometry extraction (vertices, normals, indices)
- PMI/MBD extraction from STEP AP242
- API key authentication
- Thumbnail generation
- Multi-format support (future: IGES, BREP, etc.)
"""

import os
import hashlib
import tempfile
import logging
import base64
from typing import Optional, List
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Security, Depends, Request
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from extractor import extract_geometry_and_pmi, ProcessingResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# Configuration
# =============================================================================

# API Key authentication
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
API_KEYS: List[str] = [k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()]
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "true").lower() == "true"

# CORS configuration
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

# Rate limiting (simple in-memory, use Redis for production)
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "100"))

# =============================================================================
# FastAPI App
# =============================================================================

app = FastAPI(
    title="CAD Processing Service",
    description="Extracts geometry and PMI from CAD files (STEP, IGES, etc.)",
    version="2.0.0",
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

    if api_key not in API_KEYS:
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
    id: str
    type: str
    value: float
    unit: str = "mm"
    symbol: str
    datum_refs: List[str] = []
    text: str
    position: Vector3


class Datum(BaseModel):
    id: str
    label: str
    position: Vector3


class PMIData(BaseModel):
    """PMI annotation data."""
    version: str = "1.0"
    dimensions: List[Dimension] = []
    geometric_tolerances: List[GeometricTolerance] = []
    datums: List[Datum] = []


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
        "service": "cad-processor",
        "version": "2.0.0",
        "auth_required": REQUIRE_AUTH,
        "auth_configured": len(API_KEYS) > 0,
    }


@app.get("/info")
async def service_info():
    """Service information and capabilities."""
    return {
        "service": "cad-processor",
        "version": "2.0.0",
        "supported_formats": ["step", "stp", "iges", "igs", "brep"],
        "capabilities": {
            "geometry_extraction": True,
            "pmi_extraction": True,
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
    start_time = datetime.now()

    try:
        logger.info(f"Processing CAD file: {request.file_url}")

        # Download the file
        async with httpx.AsyncClient(timeout=120.0) as client:
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
            # Process the file
            result = extract_geometry_and_pmi(
                tmp_path,
                extract_geometry=request.include_geometry,
                extract_pmi=request.include_pmi,
                generate_thumbnail=request.generate_thumbnail,
                thumbnail_size=request.thumbnail_size,
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
                )

            if result.thumbnail_base64:
                response_data.thumbnail_base64 = result.thumbnail_base64

            logger.info(
                f"Processing complete: {result.geometry['total_vertices'] if result.geometry else 0} vertices, "
                f"{len(result.pmi.get('dimensions', [])) if result.pmi else 0} PMI dimensions"
            )

            return response_data

        finally:
            # Clean up temporary file
            os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"CAD processing failed: {e}")
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        return ProcessResponse(
            success=False,
            error=str(e),
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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
