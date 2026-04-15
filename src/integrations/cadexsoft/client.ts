/**
 * CADEXsoft MTK service client.
 *
 * The service is expected to run on the same host or private network as the
 * deployment (see `services/cadexsoft/README.md`). This client is deliberately
 * thin — no retries, no caching — higher-level hooks can layer those on.
 */

import { logger } from '@/lib/logger';
import type {
  AnalysisKind,
  AnalyzeRequest,
  AnalyzeResponse,
  HealthResponse,
} from './types';

const log = {
  debug: (msg: string, data?: unknown) => logger.debug('cadexsoft', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('cadexsoft', msg, data),
  error: (msg: string, data?: unknown) => logger.error('cadexsoft', msg, data),
};

function readEnv(key: string): string | undefined {
  const runtime = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__;
  return runtime?.[key] ?? (import.meta.env as Record<string, string | undefined>)[key];
}

export interface CadexsoftClientConfig {
  /** Base URL of the local CADEXsoft service, e.g. http://localhost:8891 */
  baseUrl: string;
  /** Optional shared secret matching CADEXSOFT_API_KEY on the service. */
  apiKey?: string;
  /** Request timeout in ms. Defaults to 120s — CAD analysis can be slow. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

export class CadexsoftServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'CadexsoftServiceError';
  }
}

export function createCadexsoftClient(
  overrides: Partial<CadexsoftClientConfig> = {},
): CadexsoftClient | null {
  const baseUrl = overrides.baseUrl ?? readEnv('VITE_CADEXSOFT_URL') ?? '';
  if (!baseUrl) {
    return null;
  }
  return new CadexsoftClient({
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey: overrides.apiKey ?? readEnv('VITE_CADEXSOFT_API_KEY') ?? undefined,
    timeoutMs: overrides.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
}

/** Convenience: returns true when a CADEXsoft service URL is configured. */
export function isCadexsoftConfigured(): boolean {
  return Boolean(readEnv('VITE_CADEXSOFT_URL'));
}

export class CadexsoftClient {
  constructor(private readonly config: CadexsoftClientConfig) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extra,
    };
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }
    return headers;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      const text = await response.text();
      const body = text ? safeJsonParse(text) : null;

      if (!response.ok) {
        log.warn(`HTTP ${response.status} from ${path}`, body);
        throw new CadexsoftServiceError(
          `CADEXsoft service error (HTTP ${response.status})`,
          response.status,
          body,
        );
      }

      return body as T;
    } catch (err) {
      if (err instanceof CadexsoftServiceError) throw err;
      if ((err as Error).name === 'AbortError') {
        log.error('CADEXsoft request timed out', { path });
        throw new CadexsoftServiceError('CADEXsoft request timed out', 408);
      }
      log.error('CADEXsoft request failed', err);
      throw new CadexsoftServiceError(
        `CADEXsoft network error: ${(err as Error).message}`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', { method: 'GET', headers: this.headers() });
  }

  analyze(
    kind: AnalysisKind,
    request: AnalyzeRequest,
  ): Promise<AnalyzeResponse> {
    const path = kind === 'pmi' ? '/extract/pmi' : `/analyze/${kind}`;
    return this.request<AnalyzeResponse>(path, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request),
    });
  }

  analyzeUpload(
    kind: AnalysisKind,
    file: File,
    extra: Partial<Pick<AnalyzeRequest, 'part_id' | 'tenant_id' | 'options'>> = {},
  ): Promise<AnalyzeResponse> {
    const path = kind === 'pmi' ? '/extract/pmi' : `/analyze/${kind}`;
    const body = new FormData();
    body.append('upload', file);
    body.append('file_name', file.name);
    if (extra.part_id) body.append('part_id', extra.part_id);
    if (extra.tenant_id) body.append('tenant_id', extra.tenant_id);
    if (extra.options) body.append('options', JSON.stringify(extra.options));

    return this.request<AnalyzeResponse>(path, {
      method: 'POST',
      headers: this.headers(), // let fetch set multipart boundary
      body,
    });
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
