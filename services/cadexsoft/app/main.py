"""CADEXsoft MTK Python service — FastAPI entrypoint.

Run locally with:

    uvicorn app.main:app --host 0.0.0.0 --port 8891

or via Docker Compose (`docker compose --profile cadexsoft up cadexsoft`).

This service is designed to run **on the same host or private network** as
Eryxon Flow. It is not intended for public internet exposure — the MTK license
binds to the host and CAD files are customer IP.
"""

from __future__ import annotations

import base64
import logging
import os
from typing import Optional

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import analyzers
from .license_loader import LicenseStatus, activate
from .schemas import AnalysisKind, AnalyzeRequest, AnalyzeResponse, HealthResponse

logging.basicConfig(level=os.getenv("CADEXSOFT_LOG_LEVEL", "INFO"))
log = logging.getLogger("cadexsoft")

API_KEY = os.getenv("CADEXSOFT_API_KEY", "").strip()
MAX_UPLOAD_BYTES = int(os.getenv("CADEXSOFT_MAX_UPLOAD_BYTES", str(200 * 1024 * 1024)))
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv(
        "CADEXSOFT_CORS_ORIGINS",
        "http://localhost:8080,http://localhost:3000,http://localhost:5173",
    ).split(",") if o.strip()
]

app = FastAPI(
    title="CADEXsoft MTK Service",
    version="0.1.0",
    description=(
        "Local-only wrapper around the CADEXsoft Manufacturing Toolkit (MTK) "
        "Python SDK. Powers DFM, sheet-metal, CNC-milling, turning and PMI "
        "analysis for Eryxon Flow."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)


@app.on_event("startup")
def _activate_license() -> None:
    status = activate()
    app.state.license_status = status
    if status.stub_mode:
        log.warning("MTK running in STUB mode: %s", status.error)
    else:
        log.info("MTK license activated (version=%s)", status.mtk_version)


def _license_status(request: Request) -> LicenseStatus:
    return request.app.state.license_status


def _require_api_key(request: Request) -> None:
    if not API_KEY:
        return  # auth disabled — caller must have chosen this explicitly
    supplied = request.headers.get("x-api-key") or ""
    authz = request.headers.get("authorization") or ""
    if authz.lower().startswith("bearer "):
        supplied = supplied or authz[7:]
    if supplied != API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing API key")


async def _resolve_payload(
    body: Optional[AnalyzeRequest],
    upload: Optional[UploadFile],
    file_name_form: Optional[str],
) -> tuple[bytes, str, Optional[str], Optional[str], dict]:
    """Accept either JSON body or multipart upload, return raw bytes + metadata."""
    if upload is not None:
        data = await upload.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="file exceeds max upload size")
        return data, file_name_form or upload.filename or "upload.bin", None, None, {}

    if body is None:
        raise HTTPException(status_code=400, detail="missing request body")

    if body.file_base64:
        try:
            data = base64.b64decode(body.file_base64, validate=True)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"invalid base64: {exc}") from exc
    elif body.file_url:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(body.file_url)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"failed to fetch file_url (HTTP {resp.status_code})",
                )
            data = resp.content
    else:
        raise HTTPException(
            status_code=400,
            detail="either file_url or file_base64 must be provided",
        )

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file exceeds max upload size")

    return data, body.file_name, body.part_id, body.tenant_id, body.options


async def _run(
    kind: AnalysisKind,
    request: Request,
    body: Optional[AnalyzeRequest],
    upload: Optional[UploadFile],
    file_name_form: Optional[str],
) -> JSONResponse:
    _require_api_key(request)
    data, file_name, part_id, _tenant_id, options = await _resolve_payload(
        body, upload, file_name_form
    )
    status_code, payload = analyzers.run_analysis(
        kind, data, file_name, part_id, options, _license_status(request)
    )
    # Validate against the shared schema so drift between client/server is caught.
    AnalyzeResponse.model_validate(payload)
    return JSONResponse(status_code=status_code, content=payload)


@app.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    status = _license_status(request)
    return HealthResponse(
        status="ok" if not status.stub_mode else "degraded",
        mtk_available=status.mtk_available,
        license_activated=status.license_activated,
        mtk_version=status.mtk_version,
        stub_mode=status.stub_mode,
        error=status.error,
    )


# ---------------------------------------------------------------------------
# Analysis endpoints — all accept JSON (AnalyzeRequest) or multipart upload.
# ---------------------------------------------------------------------------

def _analyze_route(kind: AnalysisKind):
    async def handler(
        request: Request,
        body: Optional[AnalyzeRequest] = None,
        upload: Optional[UploadFile] = File(default=None),
        file_name: Optional[str] = Form(default=None),
    ) -> JSONResponse:
        return await _run(kind, request, body, upload, file_name)

    handler.__name__ = f"analyze_{kind.replace('-', '_')}"
    return handler


app.post("/analyze/dfm", response_model=AnalyzeResponse)(_analyze_route("dfm"))
app.post("/analyze/sheet-metal", response_model=AnalyzeResponse)(_analyze_route("sheet-metal"))
app.post("/analyze/cnc-milling", response_model=AnalyzeResponse)(_analyze_route("cnc-milling"))
app.post("/analyze/turning", response_model=AnalyzeResponse)(_analyze_route("turning"))
app.post("/extract/pmi", response_model=AnalyzeResponse)(_analyze_route("pmi"))
