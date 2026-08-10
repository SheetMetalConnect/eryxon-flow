# Inventory Phase 2 — Dry-Run Import Report

**No rows were written to the database.** This report is for review before a live import.

## Source

| Field | Value |
| --- | --- |
| Workbook | `C:/Users/hvine/Projects/eryxon-flow/data/inventory/BarInventory.xlsx` |
| Header handling | Skip rows 1–3; headers on row 4 (cols B–H); data from row 5+ |
| Categories | `Bar Grating`, `Treads` |
| Focus rows | **85** |
| Quantity unit | panels / pieces |

## Parser success

| Metric | Count | Rate |
| --- | ---: | ---: |
| Structurally usable (depth + thickness) | 84 | 98.8% |
| Confidence **high** | 75 | 88.2% |
| Confidence **medium** | 9 | 10.6% |
| Confidence **low** | 0 | 0.0% |
| Confidence **none** | 1 | 1.2% |
| Failed / non-geometry | 1 | 1.2% |

## Field extraction rates

| Field | Count | Rate |
| --- | ---: | ---: |
| barDepthIn | 84 | 98.8% |
| barThicknessIn | 84 | 98.8% |
| designation | 63 | 74.1% |
| surface | 79 | 92.9% |
| finish | 39 | 45.9% |
| material | 84 | 98.8% |
| panelWidthIn | 66 | 77.6% |
| panelLengthIn | 66 | 77.6% |

## Rows that failed to parse / lack geometry (1)

- **Row 191** `pblk` [Bar Grating] [none]: `Painted BLACK.` — _non-product or fabrication note without geometry; missing bearing bar depth and/or thickness_

## Negative quantities flagged for reconciliation (17)

- `T4x48`: qty **-18** — `1-1/4 X 3/16 X 97mm X 1219mm Stair Treads`
- `T4x36`: qty **-133** — `1-1/4 X 3/16 X 97mm X 914mm Stair Treads`
- `T12X36G`: qty **-2118** — `1-1/4 X 3/16 X 12"  X  36" Serrated Galvanized Stair Treads`
- `T12X36B`: qty **-445** — `1-1/4 X 3/16  X 308mm X 914mm Serrated Treads Painted Black`
- `T11X48`: qty **-197** — `1-1/4 X 3/16 X 10-15/16 X 48" Serrated Treads`
- `T11x36G`: qty **-74** — `1-1/4 X 3/16 X 11" X 36"  Serrated Galvanized`
- `T11X36B`: qty **-197** — `1-1/4 X 3/16 X 11" X 36" Serrated Painted Black`
- `T11X36`: qty **-248** — `1-1/4 X 3/16 X 11" X 36" Serrated Treads unpainted`
- `T10X48`: qty **-35** — `1-1/4 X 3/16 X -9-3/4 X48" Serrated Treads`
- `T10X36B`: qty **-52** — `1-1/4X3/16X10"X 36" Serrated Treads Painted Black`
- `86P`: qty **-3** — `2" X 3/8" X 2' X 20' 19W4`
- `63S`: qty **-64** — `1-1/2X3/16 19W4 Serrated  3'X24'`
- `63P`: qty **-41** — `1-1/2X3/16 19W4  3'X24'  PLAIN UNP`
- `53S38W4`: qty **-6** — `1-1/4" X 3/16 Serrated 38W4`
- `53S`: qty **-906** — `1-1/4X3/16  Serrated  19W4  3'X24'`
- `53 SG`: qty **-74** — `1-1/4X3/16 19W4 Serrated  3'X24' Galvanized.`
- `43S`: qty **-8** — `1X3/16 19W4 Serrated 3X24 Bare.`

## Schema ready (not populated with stock)

Migrations (Postgres / Supabase):

- `supabase/migrations/20260807180000_nisku_inventory_module.sql` — tables + RLS
- `supabase/migrations/20260807180100_seed_grating_section_props.sql` — section-prop seeds (standard sizes)

Tables: `inventory_items`, `inventory_adjustments`, `inventory_allocations`, `grating_section_props`.

## Next step after your review

Approve this dry-run → live import into `inventory_items` (still no UI).

Machine-readable detail: `docs/inventory/dry-run-results.json`
