"""
PMI Extraction Service

FastAPI service that extracts PMI (Product Manufacturing Information) from STEP AP242 files
using pythonocc-core (OpenCASCADE Python bindings).
"""

import os
import hashlib
import tempfile
import logging
from typing import Optional
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from extractor import extract_pmi_from_file, PMIData

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PMI Extraction Service",
    description="Extracts dimensions, tolerances, and GD&T from STEP AP242 files",
    version="1.0.0",
)

# CORS configuration - allow requests from the frontend
# In production, restrict this to your actual frontend domain
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ExtractionRequest(BaseModel):
    """Request body for PMI extraction."""
    file_url: HttpUrl
    file_name: Optional[str] = None


class ExtractionResponse(BaseModel):
    """Response body for PMI extraction."""
    success: bool
    pmi: Optional[PMIData] = None
    error: Optional[str] = None
    processing_time_ms: int
    file_hash: Optional[str] = None


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {"status": "healthy", "service": "pmi-extractor"}


@app.post("/extract", response_model=ExtractionResponse)
async def extract_pmi(
    request: ExtractionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Extract PMI from a STEP file.

    Downloads the file from the provided URL, extracts PMI data using OpenCASCADE,
    and returns structured JSON with dimensions, tolerances, and datums.

    Args:
        request: Contains file_url pointing to the STEP file
        authorization: Optional Bearer token for authenticated requests

    Returns:
        ExtractionResponse with PMI data or error message
    """
    start_time = datetime.now()

    try:
        logger.info(f"Starting PMI extraction for: {request.file_url}")

        # Download the STEP file
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Forward authorization header if present
            headers = {}
            if authorization:
                headers["Authorization"] = authorization

            response = await client.get(str(request.file_url), headers=headers)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download file: HTTP {response.status_code}"
                )

            file_content = response.content

        # Calculate file hash for caching
        file_hash = hashlib.sha256(file_content).hexdigest()[:16]

        # Write to temporary file for processing
        with tempfile.NamedTemporaryFile(suffix=".step", delete=False) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name

        try:
            # Extract PMI
            pmi_data = extract_pmi_from_file(tmp_path)

            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

            # Check if any PMI was found
            has_pmi = (
                len(pmi_data.dimensions) > 0 or
                len(pmi_data.geometric_tolerances) > 0 or
                len(pmi_data.datums) > 0
            )

            if has_pmi:
                logger.info(
                    f"Extracted PMI: {len(pmi_data.dimensions)} dimensions, "
                    f"{len(pmi_data.geometric_tolerances)} tolerances, "
                    f"{len(pmi_data.datums)} datums"
                )
            else:
                logger.info("No PMI data found in file")

            return ExtractionResponse(
                success=True,
                pmi=pmi_data if has_pmi else None,
                processing_time_ms=processing_time,
                file_hash=file_hash,
            )

        finally:
            # Clean up temporary file
            os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"PMI extraction failed: {e}")
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        return ExtractionResponse(
            success=False,
            error=str(e),
            processing_time_ms=processing_time,
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
