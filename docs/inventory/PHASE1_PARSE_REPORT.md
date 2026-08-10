# Inventory Phase 1 — Parse Report

Generated from `data/inventory/bar-treads-rows.json`
(source workbook: `BarInventory.xlsx`, categories **Bar Grating** + **Treads**).

## Summary

| Metric | Count | Rate |
| --- | ---: | ---: |
| Focus rows | 85 | 100% |
| Structurally usable (depth + thickness) | 84 | 98.8% |
| Confidence **high** | 75 | 88.2% |
| Confidence **medium** | 9 | 10.6% |
| Confidence **low** | 0 | 0.0% |
| Confidence **none** | 1 | 1.2% |

## Field extraction rates

| Field | Count | Rate |
| --- | ---: | ---: |
| barDepthIn | 84 | 98.8% |
| barThicknessIn | 84 | 98.8% |
| designation (e.g. 19W4) | 63 | 74.1% |
| surface | 79 | 92.9% |
| finish | 39 | 45.9% |
| material | 84 | 98.8% |
| panelWidthIn | 66 | 77.6% |
| panelLengthIn | 66 | 77.6% |

## Failures / non-geometry rows (1)

- **pblk** [none]: `Painted BLACK.` — non-product or fabrication note without geometry; missing bearing bar depth and/or thickness

## Partial parses (medium/low with geometry) — sample

- **T4x48** [medium]: `1-1/4 X 3/16 X 97mm X 1219mm Stair Treads`
- **T4x36** [medium]: `1-1/4 X 3/16 X 97mm X 914mm Stair Treads`
- **T12X48** [medium]: `1-1/4 X 3/16 X 308mm X 1219mm Stair Treads.`
- **T10X48** [medium]: `1-1/4 X 3/16 X -9-3/4 X48" Serrated Treads`
- **86S** [medium]: `2" X 3/8 Serrated`
- **64S** [medium]: `1-1/2 X 1/4 Serrated Unpainted`
- **63SAL** [medium]: `1-1/2 X 3/16 X 3' X 24' Serrated Aluminium.`
- **43SALM** [medium]: `1" X 3/16 Serrated Aluminium 3' X 24'`
- **1238P** [medium]: `3" X 3/8 X20' X 2' Smooth`

## Notes

- Quantity unit is **panels/pieces**; `area_sqft` is derived when both panel dimensions parse.
- See `PHASE1_ASSUMPTIONS.md` for structural math assumptions.
- Full machine-readable dump: `docs/inventory/parse-results.json`
