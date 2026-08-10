/**
 * Phase 1 parse report — runs against extracted Bar Grating + Treads rows.
 *
 * Usage: npx tsx scripts/inventory-parse-report.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseGratingDescription,
  panelAreaSqFt,
} from "../src/lib/inventory/index.ts";

interface Row {
  item_no: string;
  description: string;
  type: string;
  quantity: number | null;
  category: string;
}

const root = resolve(import.meta.dirname, "..");
const rowsPath = resolve(root, "data/inventory/bar-treads-rows.json");
const outDir = resolve(root, "docs/inventory");
mkdirSync(outDir, { recursive: true });

const rows = JSON.parse(readFileSync(rowsPath, "utf8")) as Row[];

const byConfidence = { high: 0, medium: 0, low: 0, none: 0 };
const fieldHits = {
  barDepthIn: 0,
  barThicknessIn: 0,
  designation: 0,
  surface: 0,
  finish: 0,
  material: 0,
  panelWidthIn: 0,
  panelLengthIn: 0,
};
const failures: Array<{ item_no: string; description: string; confidence: string; warnings: string[] }> = [];
const partial: typeof failures = [];
const parsedRows: unknown[] = [];

for (const row of rows) {
  const p = parseGratingDescription(row.description, {
    categoryHint: row.category,
  });
  byConfidence[p.confidence] += 1;
  if (p.barDepthIn != null) fieldHits.barDepthIn += 1;
  if (p.barThicknessIn != null) fieldHits.barThicknessIn += 1;
  if (p.designation) fieldHits.designation += 1;
  if (p.surface !== "unknown") fieldHits.surface += 1;
  if (p.finish !== "unknown") fieldHits.finish += 1;
  if (p.material !== "unknown") fieldHits.material += 1;
  if (p.panelWidthIn != null) fieldHits.panelWidthIn += 1;
  if (p.panelLengthIn != null) fieldHits.panelLengthIn += 1;

  const entry = {
    item_no: row.item_no,
    category: row.category,
    quantity: row.quantity,
    description: row.description,
    parsed: p,
    area_sqft: panelAreaSqFt(p.panelWidthIn, p.panelLengthIn),
  };
  parsedRows.push(entry);

  if (p.confidence === "none" || p.barDepthIn == null || p.barThicknessIn == null) {
    failures.push({
      item_no: row.item_no,
      description: row.description,
      confidence: p.confidence,
      warnings: p.warnings,
    });
  } else if (p.confidence === "low" || p.confidence === "medium") {
    partial.push({
      item_no: row.item_no,
      description: row.description,
      confidence: p.confidence,
      warnings: p.warnings,
    });
  }
}

const n = rows.length;
const structurallyUsable = rows.filter((r) => {
  const p = parseGratingDescription(r.description, {
    categoryHint: r.category,
  });
  return p.barDepthIn != null && p.barThicknessIn != null;
}).length;

const pct = (x: number) => `${((100 * x) / n).toFixed(1)}%`;

const report = `# Inventory Phase 1 — Parse Report

Generated from \`data/inventory/bar-treads-rows.json\`
(source workbook: \`BarInventory.xlsx\`, categories **Bar Grating** + **Treads**).

## Summary

| Metric | Count | Rate |
| --- | ---: | ---: |
| Focus rows | ${n} | 100% |
| Structurally usable (depth + thickness) | ${structurallyUsable} | ${pct(structurallyUsable)} |
| Confidence **high** | ${byConfidence.high} | ${pct(byConfidence.high)} |
| Confidence **medium** | ${byConfidence.medium} | ${pct(byConfidence.medium)} |
| Confidence **low** | ${byConfidence.low} | ${pct(byConfidence.low)} |
| Confidence **none** | ${byConfidence.none} | ${pct(byConfidence.none)} |

## Field extraction rates

| Field | Count | Rate |
| --- | ---: | ---: |
| barDepthIn | ${fieldHits.barDepthIn} | ${pct(fieldHits.barDepthIn)} |
| barThicknessIn | ${fieldHits.barThicknessIn} | ${pct(fieldHits.barThicknessIn)} |
| designation (e.g. 19W4) | ${fieldHits.designation} | ${pct(fieldHits.designation)} |
| surface | ${fieldHits.surface} | ${pct(fieldHits.surface)} |
| finish | ${fieldHits.finish} | ${pct(fieldHits.finish)} |
| material | ${fieldHits.material} | ${pct(fieldHits.material)} |
| panelWidthIn | ${fieldHits.panelWidthIn} | ${pct(fieldHits.panelWidthIn)} |
| panelLengthIn | ${fieldHits.panelLengthIn} | ${pct(fieldHits.panelLengthIn)} |

## Failures / non-geometry rows (${failures.length})

${failures
  .map(
    (f) =>
      `- **${f.item_no}** [${f.confidence}]: \`${f.description}\`${f.warnings.length ? ` — ${f.warnings.join("; ")}` : ""}`,
  )
  .join("\n") || "_None_"}

## Partial parses (medium/low with geometry) — sample

${partial
  .slice(0, 25)
  .map(
    (f) =>
      `- **${f.item_no}** [${f.confidence}]: \`${f.description}\`${f.warnings.length ? ` — ${f.warnings.join("; ")}` : ""}`,
  )
  .join("\n") || "_None_"}

## Notes

- Quantity unit is **panels/pieces**; \`area_sqft\` is derived when both panel dimensions parse.
- See \`PHASE1_ASSUMPTIONS.md\` for structural math assumptions.
- Full machine-readable dump: \`docs/inventory/parse-results.json\`
`;

writeFileSync(resolve(outDir, "PHASE1_PARSE_REPORT.md"), report, "utf8");
writeFileSync(
  resolve(outDir, "parse-results.json"),
  JSON.stringify(parsedRows, null, 2),
  "utf8",
);

console.log(report);
console.log(`\nWrote ${resolve(outDir, "PHASE1_PARSE_REPORT.md")}`);
