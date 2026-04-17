"""Request/response models for the CADEXsoft integration service.

These shapes are the contract between the Eryxon Flow frontend
(`src/integrations/cadexsoft/`) and this service. Keep them in sync with
`cadexsoft.types.ts`.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


AnalysisKind = Literal["dfm", "sheet-metal", "cnc-milling", "turning", "pmi"]


class AnalyzeRequest(BaseModel):
    """Body for POST /analyze/*.

    Either ``file_url`` (a URL the service can fetch — e.g. a Supabase signed
    URL) or ``file_base64`` must be provided. ``file_name`` is used to pick the
    CAD reader by extension.
    """

    file_url: Optional[str] = None
    file_base64: Optional[str] = None
    file_name: str = Field(..., min_length=1)
    part_id: Optional[str] = None
    tenant_id: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)


class Issue(BaseModel):
    id: str
    severity: Literal["info", "warning", "error"]
    category: str
    message: str
    face_ids: List[str] = Field(default_factory=list)
    edge_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Feature(BaseModel):
    id: str
    kind: str  # e.g. "hole", "pocket", "bend", "slot"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    face_ids: List[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    status: Literal["ok", "stub", "error"]
    analysis: AnalysisKind
    mtk_version: Optional[str] = None
    processing_time_ms: int = 0
    file_name: str
    part_id: Optional[str] = None
    issues: List[Issue] = Field(default_factory=list)
    features: List[Feature] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    mtk_available: bool
    license_activated: bool
    mtk_version: Optional[str] = None
    stub_mode: bool
    error: Optional[str] = None
