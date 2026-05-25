/*
 * Canny roadmap data loader (build-time, server-side only).
 *
 * WHY THIS EXISTS
 *   The roadmap surface (`/roadmap/`, `/nl/roadmap/`, `/de/roadmap/`) must show the REAL public
 *   Canny board — not a hand-maintained, invented list. This module is the single point that talks
 *   to the Canny API. It runs in Astro's `---` frontmatter at build time (Node), so the secret key
 *   never reaches the browser bundle.
 *
 * SECURITY
 *   `CANNY_API_KEY` is a SECRET, server-side-only key (Canny's own warning). It is read from the
 *   environment via `process.env` / `import.meta.env` at build time only. It is NEVER referenced in
 *   client `<script>` blocks and must never appear in `dist/`. The auth model is `apiKey` in the
 *   POST body (https://developers.canny.io/api-reference).
 *
 * ROBUSTNESS
 *   If the key is missing (e.g. CI without secrets), the network fails, or Canny rate-limits, we do
 *   NOT fail the build. `loadCannyRoadmap()` returns `{ ok: false, ... }` and the page renders an
 *   honest empty state plus the link-out to the public board. A real build with the key present
 *   shows the live data.
 *
 * SCOPE
 *   Read path only (pull). The site never writes to Canny — Luke manages the board in Canny's own
 *   UI. There is deliberately no push/sync-back path in this repo.
 */

const CANNY_API_BASE = "https://canny.io/api/v1";

/**
 * Canny's roadmap-relevant post statuses, in the order we want to present them. These are Canny's
 * own built-in status strings (https://developers.canny.io/api-reference → posts statuses). We
 * intentionally omit "open" (un-triaged, not yet on the roadmap) and "closed" (won't do) from the
 * board view — those are not roadmap signal.
 */
export const CANNY_ROADMAP_STATUSES = [
  "under review",
  "planned",
  "in progress",
  "complete",
] as const;

export type CannyRoadmapStatus = (typeof CANNY_ROADMAP_STATUSES)[number];

/** The shape of a post as we consume it on the roadmap (a trimmed subset of the Canny response). */
export interface CannyPost {
  id: string;
  title: string;
  /** First line of the post body, used as the card note. May be empty. */
  details: string;
  status: string;
  score: number;
  commentCount: number;
  category: string | null;
  /** Public board URL for this post (anonymous-visitor friendly, not the /admin/ path). */
  url: string;
  created: string;
}

export interface CannyBoard {
  id: string;
  name: string;
  postCount: number;
  /** Public board landing URL. */
  url: string;
}

export interface CannyRoadmapData {
  ok: boolean;
  /** Present when ok. */
  board?: CannyBoard;
  posts: CannyPost[];
  /** Set when ok === false, for logging/empty-state context. Never shown raw to users. */
  reason?: string;
}

/** Read the secret key from the build environment. Works under both Astro (import.meta.env) and Node (process.env). */
function readApiKey(): string | undefined {
  // import.meta.env is populated by Astro/Vite at build time; process.env covers plain Node (scripts).
  const fromImportMeta =
    typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string | undefined> }).env
      ? (import.meta as { env: Record<string, string | undefined> }).env.CANNY_API_KEY
      : undefined;
  return fromImportMeta ?? (typeof process !== "undefined" ? process.env.CANNY_API_KEY : undefined);
}

/** Turn Canny's admin board/post URL into the public, anonymous-visitor URL. */
function toPublicUrl(adminUrl: string | undefined): string {
  if (!adminUrl) return CANNY_PUBLIC_BOARD_URL;
  // Admin URLs look like https://eryxon-flow.canny.io/admin/board/eryxon[/p/<slug>].
  // The public path drops the `/admin/board` segment: https://eryxon-flow.canny.io/eryxon[/p/<slug>].
  return adminUrl.replace("/admin/board/", "/");
}

/**
 * Public Canny board landing page. This is the anonymous-visitor URL (not the /admin/ path the API
 * returns). Single source of truth for the roadmap link-out, used as a fallback when a post URL is
 * missing and in the vote CTA.
 */
export const CANNY_PUBLIC_BOARD_URL = "https://eryxon-flow.canny.io/eryxon";

async function cannyPost<T>(endpoint: string, body: Record<string, string | number>): Promise<T> {
  const res = await fetch(`${CANNY_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Canny ${endpoint} returned HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Fetch the public Eryxon Flow board and its roadmap posts at build time.
 *
 * Never throws: on any failure (missing key, network, rate limit, unexpected shape) it returns
 * `{ ok: false, posts: [], reason }` and logs a single warning, so the build stays green.
 */
export async function loadCannyRoadmap(): Promise<CannyRoadmapData> {
  const apiKey = readApiKey();
  if (!apiKey) {
    console.warn(
      "[canny] CANNY_API_KEY not set — roadmap will render its empty state with the public board link. " +
        "Set CANNY_API_KEY in website/.env for a live build.",
    );
    return { ok: false, posts: [], reason: "missing-key" };
  }

  try {
    const boardsRes = await cannyPost<{ boards: Array<{ id: string; name: string; postCount: number; url: string }> }>(
      "boards/list",
      { apiKey },
    );
    const rawBoard = boardsRes.boards?.[0];
    if (!rawBoard) {
      console.warn("[canny] No boards returned — rendering empty state.");
      return { ok: false, posts: [], reason: "no-board" };
    }

    const postsRes = await cannyPost<{
      posts: Array<{
        id: string;
        title: string;
        details?: string;
        status: string;
        score: number;
        commentCount: number;
        category?: { name: string } | null;
        url?: string;
        created: string;
      }>;
    }>("posts/list", { apiKey, boardID: rawBoard.id, limit: 100, sort: "score" });

    const posts: CannyPost[] = (postsRes.posts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      details: firstLine(p.details ?? ""),
      status: p.status,
      score: p.score ?? 0,
      commentCount: p.commentCount ?? 0,
      category: p.category?.name ?? null,
      url: toPublicUrl(p.url),
      created: p.created,
    }));

    return {
      ok: true,
      board: {
        id: rawBoard.id,
        name: rawBoard.name,
        postCount: rawBoard.postCount,
        url: toPublicUrl(rawBoard.url),
      },
      posts,
    };
  } catch (err) {
    console.warn(`[canny] Roadmap fetch failed (${(err as Error).message}) — rendering empty state.`);
    return { ok: false, posts: [], reason: "fetch-failed" };
  }
}

/** Collapse a post body to a single short line for use as a card note. */
function firstLine(details: string): string {
  const line = details.replace(/\r/g, "").split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

/** Group posts by Canny status, returning only the roadmap statuses in presentation order. */
export function groupByStatus(posts: CannyPost[]): Record<CannyRoadmapStatus, CannyPost[]> {
  const groups = Object.fromEntries(CANNY_ROADMAP_STATUSES.map((s) => [s, [] as CannyPost[]])) as Record<
    CannyRoadmapStatus,
    CannyPost[]
  >;
  for (const post of posts) {
    const status = post.status as CannyRoadmapStatus;
    if (status in groups) groups[status].push(post);
  }
  return groups;
}
