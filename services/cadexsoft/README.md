# CADEXsoft MTK Python Service — Local Integration

> **Local-only.** This service MUST run on the same machine or private network as your
> Eryxon Flow deployment. CADEXsoft Manufacturing Toolkit (MTK) is a licensed C++ SDK
> with a Python wrapper and a license key that ties to a specific environment.
> See https://docs.cadexsoft.com/mtkpython/mtk_web_installation.html

## What this service does

Wraps the CADEXsoft MTK Python SDK behind a small HTTP API that Eryxon Flow can call
from the browser (via `VITE_CADEXSOFT_URL`). It accepts a CAD file (STEP, IGES, JT,
SolidWorks, etc.), runs manufacturing-toolkit analyses, and returns a JSON payload
that the MES can store alongside a part.

Groundwork capabilities (stubs until license is activated):

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness + license status |
| `POST /analyze/dfm` | Generic design-for-manufacturability checks |
| `POST /analyze/sheet-metal` | Unfolding, bends, flat pattern, notches |
| `POST /analyze/cnc-milling` | Feature recognition, pockets, holes, undercuts |
| `POST /analyze/turning` | Turnable features, grooves, thread recognition |
| `POST /extract/pmi` | PMI extraction (aligns with existing `usePMI` hook contract) |

All endpoints accept `{ file_url, file_name }` or a multipart upload.

## Prerequisites

1. **License file from CADEXsoft Customer Corner.**
   You will receive a `mtk_license.py` (a Python module exporting a function
   that returns the license string). Place it at
   `services/cadexsoft/license/mtk_license.py` — this path is **gitignored**,
   never commit a real license.

2. **MTK Python wheel** from your Customer Corner download. Either:
   - drop the `.whl` file into `services/cadexsoft/vendor/` and the Dockerfile
     will `pip install` it, or
   - set `MTK_WHEEL_URL` to a private, authenticated URL before building.

3. **Docker + docker-compose** on the host that will run the service.

## Running locally

```bash
# 1. Drop the license file in place
cp /path/to/mtk_license.py services/cadexsoft/license/mtk_license.py

# 2. Drop the MTK wheel in services/cadexsoft/vendor/ (file stays out of git)
mkdir -p services/cadexsoft/vendor
cp /path/to/manufacturing_toolkit-*.whl services/cadexsoft/vendor/

# 3. Start the service (opt-in profile so it does not run by default)
docker compose --profile cadexsoft up -d cadexsoft

# 4. Verify
curl http://localhost:8891/health
```

Then in your Eryxon Flow `.env`:

```bash
VITE_CADEXSOFT_URL="http://localhost:8891"
VITE_CADEXSOFT_API_KEY="a-shared-secret-you-pick"
```

And set the same value as `CADEXSOFT_API_KEY` in the container environment.

## Why local-only?

- The MTK license binds to the machine/environment it is activated on.
- CAD files are customer IP — keep them off shared cloud infra unless explicitly
  contracted.
- Analyses are CPU-bound and benefit from co-location with the frontend user.

## Development without the license

The service ships a **stub mode**: if the license file or the `manufacturing_toolkit`
package is not importable, every analysis endpoint returns a deterministic
`{"status": "stub", ...}` payload so the frontend integration can be exercised
end-to-end before the license arrives. Check `/health` → `mtk_available` to see
which mode is active.
