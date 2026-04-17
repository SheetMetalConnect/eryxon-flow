/**
 * CADEXsoft MTK service types.
 *
 * Mirror of `services/cadexsoft/app/schemas.py`. Keep the two in sync — the
 * Python service validates its own responses against the Pydantic models, and
 * this file is the contract on the frontend side.
 */

export type AnalysisKind =
  | 'dfm'
  | 'sheet-metal'
  | 'cnc-milling'
  | 'turning'
  | 'pmi';

export interface AnalyzeRequest {
  /** Fetchable URL (e.g. Supabase signed URL). Mutually exclusive with file_base64. */
  file_url?: string;
  /** Base64-encoded file bytes. Mutually exclusive with file_url. */
  file_base64?: string;
  file_name: string;
  part_id?: string;
  tenant_id?: string;
  options?: Record<string, unknown>;
}

export type IssueSeverity = 'info' | 'warning' | 'error';

export interface Issue {
  id: string;
  severity: IssueSeverity;
  category: string;
  message: string;
  face_ids: string[];
  edge_ids: string[];
  metadata: Record<string, unknown>;
}

export interface Feature {
  id: string;
  kind: string;
  parameters: Record<string, unknown>;
  face_ids: string[];
}

export type AnalyzeStatus = 'ok' | 'stub' | 'error';

export interface AnalyzeResponse {
  status: AnalyzeStatus;
  analysis: AnalysisKind;
  mtk_version: string | null;
  processing_time_ms: number;
  file_name: string;
  part_id: string | null;
  issues: Issue[];
  features: Feature[];
  summary: Record<string, unknown>;
  error?: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  mtk_available: boolean;
  license_activated: boolean;
  mtk_version: string | null;
  stub_mode: boolean;
  error?: string | null;
}
