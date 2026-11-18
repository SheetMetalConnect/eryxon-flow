import { serveApi } from "@shared/handler.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { createAuthorizedPrivateSignedUrl } from "@shared/private-storage.ts";
import {
  BadRequestError,
  InternalServerError,
} from "@shared/validation/errorHandler.ts";

type CADBackendMode = "custom" | "byob" | "frontend";
type CADProxyAction = "process" | "process-async" | "extract";

interface CADSourceRef {
  bucket: "parts-cad";
  path: string;
  recordId: string;
}

interface CADBackendConfig {
  mode: Exclude<CADBackendMode, "frontend">;
  url: string;
  apiKey: string;
  timeoutMs: number;
}

function parseMode(value: string | undefined): CADBackendMode | null {
  if (value === "custom" || value === "byob" || value === "frontend") {
    return value;
  }
  return null;
}

function parseTimeout(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function resolveBackendConfig(): CADBackendConfig {
  const configuredMode = parseMode(Deno.env.get("CAD_BACKEND_MODE"));
  const customUrl = Deno.env.get("CAD_SERVICE_URL")?.trim() ?? "";
  const byobUrl = Deno.env.get("BYOB_CAD_URL")?.trim() ?? "";

  const mode = configuredMode
    ?? (customUrl ? "custom" : byobUrl ? "byob" : "frontend");

  if (mode === "frontend") {
    throw new BadRequestError("CAD proxy backend not configured");
  }

  const config = mode === "custom"
    ? {
        mode,
        url: customUrl,
        apiKey: Deno.env.get("CAD_SERVICE_API_KEY")?.trim() ?? "",
        timeoutMs: parseTimeout(Deno.env.get("CAD_SERVICE_TIMEOUT_MS"), 120000),
      }
    : {
        mode,
        url: byobUrl,
        apiKey: Deno.env.get("BYOB_CAD_API_KEY")?.trim() ?? "",
        timeoutMs: parseTimeout(Deno.env.get("BYOB_CAD_TIMEOUT_MS"), 120000),
      };

  if (!config.url) {
    throw new InternalServerError(
      `Missing ${mode === "custom" ? "CAD_SERVICE_URL" : "BYOB_CAD_URL"}`,
    );
  }

  return config;
}

function parseAction(value: unknown): CADProxyAction {
  if (value === "process" || value === "process-async" || value === "extract") {
    return value;
  }
  throw new BadRequestError("Invalid CAD proxy action");
}

function parseSource(value: unknown): CADSourceRef {
  if (!value || typeof value !== "object") {
    throw new BadRequestError("source is required");
  }

  const candidate = value as Partial<CADSourceRef>;
  if (candidate.bucket !== "parts-cad") {
    throw new BadRequestError("Invalid source bucket");
  }
  if (!candidate.path?.trim() || !candidate.recordId?.trim()) {
    throw new BadRequestError("source.path and source.recordId are required");
  }

  return {
    bucket: "parts-cad",
    path: candidate.path.trim(),
    recordId: candidate.recordId.trim(),
  };
}

function parseBody(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    throw new BadRequestError("Request body is required");
  }

  const body = raw as Record<string, unknown>;
  const fileName = typeof body.file_name === "string" ? body.file_name.trim() : "";

  if (!fileName) {
    throw new BadRequestError("file_name is required");
  }

  return {
    action: parseAction(body.action),
    source: parseSource(body.source),
    fileName,
    includeGeometry: body.include_geometry === undefined ? true : Boolean(body.include_geometry),
    includePMI: body.include_pmi === undefined ? true : Boolean(body.include_pmi),
    generateThumbnail: Boolean(body.generate_thumbnail),
    thumbnailSize: typeof body.thumbnail_size === "number" ? body.thumbnail_size : 256,
  };
}

serveApi(async (req: Request, ctx: HandlerContext) => {
  const payload = parseBody(await req.json());
  const backend = resolveBackendConfig();

  const fileUrl = await createAuthorizedPrivateSignedUrl(ctx.supabase, ctx.tenantId, {
    bucket: payload.source.bucket,
    path: payload.source.path,
    recordId: payload.source.recordId,
    expiresIn: 900,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), backend.timeoutMs);

  try {
    const response = await fetch(`${backend.url}/${payload.action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(backend.apiKey ? { "X-API-Key": backend.apiKey } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        file_url: fileUrl,
        file_name: payload.fileName,
        include_geometry: payload.includeGeometry,
        include_pmi: payload.includePMI,
        generate_thumbnail: payload.generateThumbnail,
        thumbnail_size: payload.thumbnailSize,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new InternalServerError("CAD service authentication failed");
      }

      const detail = await response.text().catch(() => "");
      throw new InternalServerError(
        detail
          ? `CAD proxy request failed: HTTP ${response.status} (${detail})`
          : `CAD proxy request failed: HTTP ${response.status}`,
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
});
