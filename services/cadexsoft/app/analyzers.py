"""Thin analyzer wrappers around the MTK Python API.

Every function accepts an in-memory CAD file payload and returns an
``AnalyzeResponse``-shaped dict. When MTK is not installed or the license is
not active, we return a deterministic stub payload so the frontend integration
can be built end-to-end.

The real MTK calls are marked with ``# MTK:`` comments so they are easy to
locate once the licensed SDK is wired in.
"""

from __future__ import annotations

import time
from typing import Any, Dict, Tuple

from .license_loader import LicenseStatus
from .schemas import AnalysisKind


def _stub_payload(kind: AnalysisKind, file_name: str, part_id: str | None,
                  status: LicenseStatus) -> Dict[str, Any]:
    return {
        "status": "stub",
        "analysis": kind,
        "mtk_version": status.mtk_version,
        "processing_time_ms": 0,
        "file_name": file_name,
        "part_id": part_id,
        "issues": [],
        "features": [],
        "summary": {
            "note": (
                "CADEXsoft MTK is not active on this host. Install the wheel and "
                "place the license module to enable real analysis."
            ),
            "stub_mode_reason": status.error,
        },
    }


def _read_cad(file_bytes: bytes, file_name: str):
    """Dispatch to the right MTK reader based on extension.

    Stub implementation — real implementation will instantiate the appropriate
    reader from ``manufacturing_toolkit`` based on the file extension (STEP,
    IGES, JT, SolidWorks, Parasolid, ACIS, ...).
    """
    # MTK: from manufacturing_toolkit.core.step import StepReader
    # MTK: model = StepReader().ReadFile(file_name, file_bytes)
    raise NotImplementedError("Wire up MTK readers once the wheel is installed")


def run_analysis(kind: AnalysisKind, file_bytes: bytes, file_name: str,
                 part_id: str | None, options: Dict[str, Any],
                 status: LicenseStatus) -> Tuple[int, Dict[str, Any]]:
    """Execute an analysis, returning (http_status, response_dict)."""
    if status.stub_mode:
        return 200, _stub_payload(kind, file_name, part_id, status)

    start = time.monotonic()
    try:
        model = _read_cad(file_bytes, file_name)  # noqa: F841 — placeholder
        # MTK: dispatch based on `kind` → MTK analyzers, map results into
        # the `Issue`/`Feature` schema shared with the frontend.
        raise NotImplementedError(
            f"MTK analyzer for '{kind}' is not yet wired up. "
            "See services/cadexsoft/README.md."
        )
    except NotImplementedError as exc:
        elapsed = int((time.monotonic() - start) * 1000)
        return 501, {
            "status": "error",
            "analysis": kind,
            "mtk_version": status.mtk_version,
            "processing_time_ms": elapsed,
            "file_name": file_name,
            "part_id": part_id,
            "issues": [],
            "features": [],
            "summary": {},
            "error": str(exc),
        }
    except Exception as exc:  # pragma: no cover - defensive
        elapsed = int((time.monotonic() - start) * 1000)
        return 500, {
            "status": "error",
            "analysis": kind,
            "mtk_version": status.mtk_version,
            "processing_time_ms": elapsed,
            "file_name": file_name,
            "part_id": part_id,
            "issues": [],
            "features": [],
            "summary": {},
            "error": f"{type(exc).__name__}: {exc}",
        }
