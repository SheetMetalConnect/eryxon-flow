/**
 * Phase 2 dry-run import — parse Bar Grating + Treads from GrpInventory.xlsx.
 * Does NOT write to the database.
 *
 * Usage:
 *   npx tsx scripts/inventory-dry-run-import.ts
 *   npx tsx scripts/inventory-dry-run-import.ts --file "C:\\path\\to\\GrpInventory.xlsx"
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import xlsxModule from "xlsx";
import {
  parseGratingDescription,
  panelAreaSqFt,
} from "../src/lib/inventory/index.ts";

const XLSX = (xlsxModule as unknown as { default?: typeof xlsxModule }).default ?? xlsxModule;

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "docs/inventory");
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(root, "data/inventory"), { recursive: true });

function resolveWorkbookPath(): string {
  const argIdx = process.argv.indexOf("--file");
  if (argIdx >= 0 && process.argv[argIdx + 1]) {
    return resolve(process.argv[argIdx + 1]);
  }
  const candidates = [
    resolve(root, "data/inventory/BarInventory.xlsx"),
    resolve(root, "data/inventory/GrpInventory.xlsx"),
    // Downloads may be named GrpInventory.xlsx (see Phase 1 notes)
    "C:\\Users\\hvine\\Downloads\\GrpInventory.xlsx",
    "C:\\Users\\hvine\\Downloads\\BarInventory.xlsx",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Fuzzy match Downloads *Inventory.xlsx ~24KB
  try {
    const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
    const dir = "C:\\Users\\hvine\\Downloads";
    for (const name of readdirSync(dir)) {
      if (!/\.xlsx$/i.test(name) || !/inventory/i.test(name)) continue;
      const full = resolve(dir, name);
      const size = statSync(full).size;
      if (size > 10_000 && size < 100_000) return full;
    }
  } catch {
    /* ignore */
  }
  throw new Error("Workbook not found. Pass --file <path-to-GrpInventory.xlsx>");
}

interface SheetRow {
  item_no: string;
  description: string;
  type: string;
  quantity: number | null;
  category: string;
  sheet_row: number;
}

function loadFocusRows(workbookPath: string): SheetRow[] {
  const wb = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  // Row 4 (1-based) = headers in cols B–H; data from row 5+
  // A=0 section?, B=1 Item No, C=2 Desc, D=3 Type, E=4 Qty, … H=7 Category
  const rows: SheetRow[] = [];
  for (let i = 4; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const itemNo = r[1];
    const desc = r[2];
    const typ = r[3];
    const qty = r[4];
    const cat = r[7];
    if (itemNo == null || String(itemNo).trim() === "") continue;
    if (String(itemNo).trim().toLowerCase().startsWith("item")) continue;
    const category = cat == null ? "" : String(cat).trim();
    if (category !== "Bar Grating" && category !== "Treads") continue;
    rows.push({
      item_no: String(itemNo).trim(),
      description: desc == null ? "" : String(desc).trim(),
      type: typ == null ? "" : String(typ).trim(),
      quantity:
        qty == null || String(qty).trim() === ""
          ? null
          : Number(qty),
      category,
      sheet_row: i + 1,
    });
  }
  return rows;
}

function suggestedSku(itemNo: string): string {
  return itemNo.trim().toUpperCase().replace(/\s+/g, "-");
}

const workbookPath = resolveWorkbookPath();
// Keep a project-local copy named BarInventory.xlsx for reproducibility
const localCopy = resolve(root, "data/inventory/BarInventory.xlsx");
try {
  copyFileSync(workbookPath, localCopy);
} catch {
  /* may already be same file */
}

console.log(`Workbook: ${workbookPath}`);
const focusRows = loadFocusRows(workbookPath);
writeFileSync(
  resolve(root, "data/inventory/bar-treads-rows.json"),
  JSON.stringify(focusRows, null, 2),
  "utf8",
);

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
const failures: Array<{
  sheet_row: number;
  item_no: string;
  category: string;
  description: string;
  confidence: string;
  warnings: string[];
}> = [];
const negatives: Array<{ item_no: string; quantity: number; description: string }> = [];
const wouldInsert: unknown[] = [];

for (const row of focusRows) {
  const parsed = parseGratingDescription(row.description, {
    categoryHint: row.category,
  });
  byConfidence[parsed.confidence] += 1;
  if (parsed.barDepthIn != null) fieldHits.barDepthIn += 1;
  if (parsed.barThicknessIn != null) fieldHits.barThicknessIn += 1;
  if (parsed.designation) fieldHits.designation += 1;
  if (parsed.surface !== "unknown") fieldHits.surface += 1;
  if (parsed.finish !== "unknown") fieldHits.finish += 1;
  if (parsed.material !== "unknown") fieldHits.material += 1;
  if (parsed.panelWidthIn != null) fieldHits.panelWidthIn += 1;
  if (parsed.panelLengthIn != null) fieldHits.panelLengthIn += 1;

  const area = panelAreaSqFt(parsed.panelWidthIn, parsed.panelLengthIn);
  const usable =
    parsed.barDepthIn != null && parsed.barThicknessIn != null;

  if (!usable || parsed.confidence === "none") {
    failures.push({
      sheet_row: row.sheet_row,
      item_no: row.item_no,
      category: row.category,
      description: row.description,
      confidence: parsed.confidence,
      warnings: parsed.warnings,
    });
  }

  if (row.quantity != null && row.quantity < 0) {
    negatives.push({
      item_no: row.item_no,
      quantity: row.quantity,
      description: row.description,
    });
  }

  wouldInsert.push({
    sheet_row: row.sheet_row,
    sku: suggestedSku(row.item_no),
    source_item_no: row.item_no,
    category: row.category,
    kind: parsed.kind === "tread" ? "tread" : "bar_grating",
    raw_description: row.description,
    qty_on_hand: row.quantity ?? 0,
    area_sqft: area,
    parse_confidence: parsed.confidence,
    structurally_usable: usable,
    parsed,
  });
}

const n = focusRows.length;
const usableCount = wouldInsert.filter(
  (r) => (r as { structurally_usable: boolean }).structurally_usable,
).length;
const pct = (x: number) => (n === 0 ? "0%" : `${((100 * x) / n).toFixed(1)}%`);

const report = `# Inventory Phase 2 — Dry-Run Import Report

**No rows were written to the database.** This report is for review before a live import.

## Source

| Field | Value |
| --- | --- |
| Workbook | \`${workbookPath.replace(/\\/g, "/")}\` |
| Header handling | Skip rows 1–3; headers on row 4 (cols B–H); data from row 5+ |
| Categories | \`Bar Grating\`, \`Treads\` |
| Focus rows | **${n}** |
| Quantity unit | panels / pieces |

## Parser success

| Metric | Count | Rate |
| --- | ---: | ---: |
| Structurally usable (depth + thickness) | ${usableCount} | ${pct(usableCount)} |
| Confidence **high** | ${byConfidence.high} | ${pct(byConfidence.high)} |
| Confidence **medium** | ${byConfidence.medium} | ${pct(byConfidence.medium)} |
| Confidence **low** | ${byConfidence.low} | ${pct(byConfidence.low)} |
| Confidence **none** | ${byConfidence.none} | ${pct(byConfidence.none)} |
| Failed / non-geometry | ${failures.length} | ${pct(failures.length)} |

## Field extraction rates

| Field | Count | Rate |
| --- | ---: | ---: |
| barDepthIn | ${fieldHits.barDepthIn} | ${pct(fieldHits.barDepthIn)} |
| barThicknessIn | ${fieldHits.barThicknessIn} | ${pct(fieldHits.barThicknessIn)} |
| designation | ${fieldHits.designation} | ${pct(fieldHits.designation)} |
| surface | ${fieldHits.surface} | ${pct(fieldHits.surface)} |
| finish | ${fieldHits.finish} | ${pct(fieldHits.finish)} |
| material | ${fieldHits.material} | ${pct(fieldHits.material)} |
| panelWidthIn | ${fieldHits.panelWidthIn} | ${pct(fieldHits.panelWidthIn)} |
| panelLengthIn | ${fieldHits.panelLengthIn} | ${pct(fieldHits.panelLengthIn)} |

## Rows that failed to parse / lack geometry (${failures.length})

${
  failures.length === 0
    ? "_None_"
    : failures
        .map(
          (f) =>
            `- **Row ${f.sheet_row}** \`${f.item_no}\` [${f.category}] [${f.confidence}]: \`${f.description}\`${f.warnings.length ? ` — _${f.warnings.join("; ")}_` : ""}`,
        )
        .join("\n")
}

## Negative quantities flagged for reconciliation (${negatives.length})

${
  negatives.length === 0
    ? "_None_"
    : negatives
        .map(
          (n) =>
            `- \`${n.item_no}\`: qty **${n.quantity}** — \`${n.description.slice(0, 100)}\``,
        )
        .join("\n")
}

## Schema ready (not populated with stock)

Migrations (Postgres / Supabase):

- \`supabase/migrations/20260807180000_nisku_inventory_module.sql\` — tables + RLS
- \`supabase/migrations/20260807180100_seed_grating_section_props.sql\` — section-prop seeds (standard sizes)

Tables: \`inventory_items\`, \`inventory_adjustments\`, \`inventory_allocations\`, \`grating_section_props\`.

## Next step after your review

Approve this dry-run → live import into \`inventory_items\` (still no UI).

Machine-readable detail: \`docs/inventory/dry-run-results.json\`
`;

writeFileSync(resolve(outDir, "PHASE2_DRY_RUN_REPORT.md"), report, "utf8");
writeFileSync(
  resolve(outDir, "dry-run-results.json"),
  JSON.stringify(
    {
      workbookPath,
      focus_row_count: n,
      byConfidence,
      fieldHits,
      failures,
      negatives,
      would_insert_sample: wouldInsert.slice(0, 20),
      would_insert_count: wouldInsert.length,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(report);
console.log(`\nWrote ${resolve(outDir, "PHASE2_DRY_RUN_REPORT.md")}`);
