# Inventory Phase 1 — Mathematical & Parsing Assumptions

Review document for Nisku Safety Grating & Fab. **No UI in this phase.**

## Scope

- Source file: `data/inventory/BarInventory.xlsx` (copied from Downloads `GrpInventory.xlsx`)
- Header row: spreadsheet row 4; data from row 5+
- Column map: `Item No.` (B), `Description` (C), `Type` (D), `Quantity` (E), `Value` (F), `Average Cost` (G), `Category` (H)
- Focus categories: **Bar Grating**, **Treads**
- Quantity unit: **panels / pieces**; square footage = `(width_in × length_in) / 144` when both dimensions parse

## Parser assumptions

1. **Bearing bar pair** is the first `depth × thickness` match where depth is the larger bar dimension (e.g. `1-1/4 × 3/16`).
2. **Designation** matches `\d{2}[WIA]\d` (case-insensitive), normalized to e.g. `19W4`.
3. **Bearing-bar spacing** from designation first number: \(s = n/16\) inches (NAAMM).
4. **Surface:** `Serrated` / `Serrtaed` (typo) / `SERR` → serrated; `Smooth` / `Plain` → smooth; else unknown (not guessed).
5. **Finish:** Galvanized / Unpainted|UNP / Bare / Painted Black|BLK.
6. **Material:** Aluminium/Aluminum → aluminum; Stainless → stainless; else **carbon_steel** when bar geometry exists.
7. **Panel size:** feet (`3'×24'`, `3X24`), inches (`12"×36"`), metric (`97mm×1219mm`).
8. **Treads** via description keywords and/or Category hint.
9. Confidence scoring as documented in the parse report.

## Structural math — material properties (mandatory)

| Material | Duty | Spec | \(F_b\) (psi) | \(E\) (psi) |
| --- | --- | --- | ---: | ---: |
| Carbon steel | **Standard / pedestrian** | ASTM A1011 Type B | **18,000** | 29,000,000 |
| Carbon steel | **Heavy / vehicular** | ASTM A1018 Grade 36 | **20,000** | 29,000,000 |
| Stainless steel | (any) | — | 20,000 | 28,000,000 |
| Aluminum | (any) | — | **12,000** | **10,000,000** |

**Critical:** Carbon steel must **not** use a blanket 20 ksi. `getMaterialProperties(material, duty)` selects Fb from duty class.

**Safety rule:** unknown material **throws**. Aluminum candidates are **never** evaluated with steel \(F_b\)/\(E\). `evaluateInventoryCandidate` rejects material mismatches.

Modules: `materialProperties.ts`, `structural.ts`, `sectionProperties.ts`.

### Span / load model

- Simply supported clear span \(L\) (inches); bearing bars only; results **per foot of width**
- Uniform: \(w = w_{psf}/12\), \(M = wL^2/8\), \(S_{req}=M/F_b\), \(I_{req}=5wL^4/(384E\delta_{max})\)
- Concentrated midspan: \(M=PL/4\), \(I_{req}=PL^3/(48E\delta_{max})\)

### Deflection policy (approved)

| Duty | \(\delta_{max}\) |
| --- | --- |
| Pedestrian / standard | \(0.25"\) |
| Heavy duty / vehicular | \(\min(0.125",\ L/400)\) |

### Serrated rules (approved)

| Duty | Rule |
| --- | --- |
| **Standard (pedestrian)** | Capacity depth = physical depth − **¼"**; required physical depth hint = smooth-equivalent + **¼"** |
| **Heavy duty** | Compute smooth required depth, then take the **next greater** depth from the heavy-duty catalog (e.g. 3" → **3-½"**). Catalog: 1, 1¼, 1½, 1¾, 2, 2¼, 2½, 3, 3½, 4, 4½, 5, 5½, 6, 7 in. |

Section properties for a candidate:

\[
N = 12/s,\quad I = N\cdot t\,d_{\mathrm{eff}}^3/12,\quad S = N\cdot t\,d_{\mathrm{eff}}^2/6
\]

### What Phase 1 does **not** do

- No UI, no DB writes, no stock allocation
- No full reprint of copyrighted NAAMM tables (formula + rectangular-bar model)
- No automatic negative-qty cleanup

## Code map

| Path | Role |
| --- | --- |
| `src/lib/inventory/materialProperties.ts` | Fb/E tables + HD catalog |
| `src/lib/inventory/parseGratingDescription.ts` | Description parser |
| `src/lib/inventory/structural.ts` | Requirements + checks |
| `src/lib/inventory/sectionProperties.ts` | \(S\)/\(I\) estimates |
| `docs/inventory/PHASE1_PARSE_REPORT.md` | Parse success rates |

## How to re-run

```bash
npx vitest run src/lib/inventory
npx tsx scripts/inventory-parse-report.ts
```
