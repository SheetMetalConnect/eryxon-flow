/**
 * CADEXsoft MTK integration — public surface.
 *
 * The service this talks to is **local-only** by contract. See
 * `docs/CADEXSOFT_INTEGRATION.md` and `services/cadexsoft/README.md` for
 * deployment details.
 */

export {
  CadexsoftClient,
  CadexsoftServiceError,
  createCadexsoftClient,
  isCadexsoftConfigured,
} from './client';
export type { CadexsoftClientConfig } from './client';
export type {
  AnalysisKind,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeStatus,
  Feature,
  HealthResponse,
  Issue,
  IssueSeverity,
} from './types';
