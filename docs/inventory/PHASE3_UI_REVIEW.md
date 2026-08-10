# Inventory Phase 3 - UI (review gate)

## Live import result
- Inserted **84** items (skipped `pblk` / Painted BLACK.)
- **17** flagged `needs_reconciliation = true` (negative qty)
- Tenant: Nisku Safety Grating

## Routes (Admin)
| Path | View |
| --- | --- |
| `/admin/inventory` | Stock list + filters |
| `/admin/inventory/reconcile` | Negative / flagged queue + quick adjust |
| `/admin/inventory/calculator` | NAAMM load calculator + allocate |

Sidebar: **Inventory** (Warehouse icon) under main admin nav.

## How to view UI
Docker image is the prebuilt GHCR build and will **not** include these pages until rebuilt.
For review now:

```bash
cd C:\Users\hvine\Projects\eryxon-flow
npm run dev
```

Open http://localhost:8080/admin/inventory (or the Vite port shown).

## Stopped before
Work order / delivery dispatch modules - awaiting your review.
