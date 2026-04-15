# CADEXsoft MTK Integration

> **Status:** groundwork landed — service scaffold, TypeScript client, Docker
> overlay, and env wiring. Analyzers themselves are stubs until a licensed MTK
> Python wheel and license file are dropped in by an operator.
>
> **Upstream docs:** https://docs.cadexsoft.com/mtkpython/mtk_web_installation.html

## What and why

[CADEXsoft Manufacturing Toolkit (MTK)](https://cadexsoft.com/) is a licensed
C++ SDK with a Python wrapper. It reads 20+ CAD formats (STEP, IGES, JT,
SolidWorks, Parasolid, ACIS, etc.) and performs:

- **DFM** (design-for-manufacturability) checks
- **Sheet-metal** unfolding, bends, flat patterns
- **CNC milling** feature recognition (pockets, holes, undercuts)
- **Turning** feature recognition
- **PMI** extraction (aligns with the existing `usePMI` hook contract)

For Eryxon Flow this is particularly useful when a part hits the system and
the shop wants an immediate readout of manufacturability risks and machining
features before the work even reaches the floor.

## Why local-only

MTK is **not** cloud-native in the SaaS sense:

1. The license activates against a specific environment. Spreading it across
   elastic cloud workers violates the EULA.
2. CAD files are customer IP. Keeping analysis on-prem (or in a private
   tenant-owned cluster) keeps us outside the data-processing scope of
   customer contracts.
3. MTK analyses are CPU-bound; co-locating with the frontend user avoids
   shipping large CAD blobs over the public internet twice.

For those reasons the integration is deliberately built as a **separate
container that binds to `127.0.0.1` by default**. It never appears in the
cloud deployment (`docker-compose.prod.yml`) unless an operator explicitly
composes it in.

## Architecture

```
Browser (Eryxon Flow)
    │
    │  VITE_CADEXSOFT_URL (local only, e.g. http://localhost:8891)
    ▼
services/cadexsoft/   ←   FastAPI wrapper
    │
    │  Python calls
    ▼
manufacturing_toolkit (licensed wheel)   ←   mtk_license.py (mounted at runtime)
    │
    ▼
Native C++ MTK engine
```

The service is orthogonal to Supabase — results come back to the browser and
can be persisted via existing edge functions (e.g. `api-parts` metadata) if
and when the team wires that up. The groundwork does not add any new database
schema on purpose, so the integration is reversible.

## Files introduced

| Path | Purpose |
|------|---------|
| `services/cadexsoft/` | Python FastAPI service, Dockerfile, license placeholder |
| `services/cadexsoft/app/main.py` | HTTP endpoints (`/health`, `/analyze/*`, `/extract/pmi`) |
| `services/cadexsoft/app/license_loader.py` | Imports `mtk_license`, activates MTK, falls back to stub |
| `services/cadexsoft/app/analyzers.py` | Thin wrappers around MTK — currently stubs marked `# MTK:` |
| `services/cadexsoft/app/schemas.py` | Pydantic models (mirror of `src/integrations/cadexsoft/types.ts`) |
| `services/cadexsoft/license/` | Runtime-mounted license; gitignored |
| `services/cadexsoft/vendor/` | Drop-in location for the MTK `.whl`; gitignored |
| `docker-compose.cadexsoft.yml` | Opt-in overlay with `cadexsoft` profile |
| `src/integrations/cadexsoft/client.ts` | Browser client (timeouts, API-key header) |
| `src/integrations/cadexsoft/types.ts` | Frontend-side contract |
| `src/config/cadBackend.ts` | `cadexsoft` added as a first-class `CADBackendMode` |
| `.env.example` | `VITE_CADEXSOFT_URL`, `VITE_CADEXSOFT_API_KEY` |

## API contract

All endpoints accept either:

- a JSON body `{ file_url, file_name, part_id?, tenant_id?, options? }`, or
- a multipart upload with `upload` + `file_name` parts.

All return `AnalyzeResponse`:

```ts
{
  status: 'ok' | 'stub' | 'error';
  analysis: 'dfm' | 'sheet-metal' | 'cnc-milling' | 'turning' | 'pmi';
  mtk_version: string | null;
  processing_time_ms: number;
  file_name: string;
  part_id: string | null;
  issues: Issue[];
  features: Feature[];
  summary: Record<string, unknown>;
  error?: string | null;
}
```

See `src/integrations/cadexsoft/types.ts` and
`services/cadexsoft/app/schemas.py` — keep them in lockstep.

## Getting a license & wheel

1. Request an MTK Python license through your CADEXsoft Customer Corner.
2. You will get two artifacts:
   - `manufacturing_toolkit-<version>-py3-none-any.whl` → drop in
     `services/cadexsoft/vendor/`
   - `mtk_license.py` (exports `value() -> str`) → drop in
     `services/cadexsoft/license/`
3. Bring the service up:
   ```bash
   docker compose \
       -f docker-compose.yml \
       -f docker-compose.cadexsoft.yml \
       --profile cadexsoft up -d
   ```
4. Verify:
   ```bash
   curl http://localhost:8891/health
   # {"status":"ok","mtk_available":true,"license_activated":true,...}
   ```

Before the wheel arrives you will see `stub_mode: true` on `/health` and every
`/analyze/*` call will return `status: "stub"` with an explanatory summary.
The frontend integration can still be developed against that surface.

## Wiring the frontend

```ts
import { createCadexsoftClient } from '@/integrations/cadexsoft';

const client = createCadexsoftClient();
if (client) {
  const health = await client.health();
  if (!health.stub_mode) {
    const result = await client.analyze('cnc-milling', {
      file_url: signedUrl,
      file_name: 'part.step',
      part_id,
    });
    // result.issues, result.features, result.summary
  }
}
```

`createCadexsoftClient()` returns `null` when `VITE_CADEXSOFT_URL` is unset, so
it is safe to call unconditionally from components.

## Next steps (out of scope for this groundwork PR)

- Implement the real MTK calls in `services/cadexsoft/app/analyzers.py`
  (search for `# MTK:` markers).
- Hook a "Run DFM analysis" action into the part detail page.
- Persist `issues`/`features`/`summary` onto the part record (probably in
  `parts.metadata.mtk` to mirror `parts.metadata.pmi`).
- Decide whether to add a Supabase realtime progress channel like `usePMI`
  uses, or keep the frontend blocking on a direct HTTP call (fine for the
  local-only constraint).
