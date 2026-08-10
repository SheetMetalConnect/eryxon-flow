/**
 * Live import: Bar Grating + Treads → inventory_items.
 * Skips rows without geometry. Flags negative qty with needs_reconciliation.
 *
 * Usage:
 *   npx tsx scripts/inventory-live-import.ts --file data/inventory/BarInventory.xlsx
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import xlsxModule from "xlsx";
import {
  parseGratingDescription,
  panelAreaSqFt,
} from "../src/lib/inventory/index.ts";

const XLSX = (xlsxModule as unknown as { default?: typeof xlsxModule }).default ?? xlsxModule;
const root = resolve(import.meta.dirname, "..");

function loadEnv(): Record<string, string> {
  const envPath = resolve(root, ".env");
  const out: Record<string, string> = {};
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function resolveWorkbook(): string {
  const idx = process.argv.indexOf("--file");
  if (idx >= 0 && process.argv[idx + 1]) return resolve(process.argv[idx + 1]);
  const p = resolve(root, "data/inventory/BarInventory.xlsx");
  if (!existsSync(p)) throw new Error("Workbook not found");
  return p;
}

function mapKind(kind: string): "bar_grating" | "tread" | "other" {
  if (kind === "tread") return "tread";
  if (kind === "bar_grating") return "bar_grating";
  return "other";
}

function mapEnum<T extends string>(value: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(value) ? (value as T) : fallback;
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");

  const tenantId =
    process.env.INVENTORY_TENANT_ID || "af3899f3-3bc4-41bf-a786-cf2d0aab34df";
  const batchId = `live-import-${new Date().toISOString().slice(0, 19)}`;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const workbookPath = resolveWorkbook();
  const wb = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let negatives = 0;
  const skippedRows: string[] = [];

  for (let i = 4; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const itemNo = r[1];
    const desc = r[2];
    const cat = r[7];
    const qtyRaw = r[4];
    if (itemNo == null || String(itemNo).trim() === "") continue;
    if (String(itemNo).trim().toLowerCase().startsWith("item")) continue;
    const category = cat == null ? "" : String(cat).trim();
    if (category !== "Bar Grating" && category !== "Treads") continue;

    const description = desc == null ? "" : String(desc).trim();
    const parsed = parseGratingDescription(description, { categoryHint: category });
    const usable = parsed.barDepthIn != null && parsed.barThicknessIn != null;
    if (!usable || parsed.confidence === "none") {
      skipped += 1;
      skippedRows.push(`row ${i + 1} ${String(itemNo)}: ${description.slice(0, 80)}`);
      continue;
    }

    const qty = qtyRaw == null || String(qtyRaw).trim() === "" ? 0 : Number(qtyRaw);
    const needsReconciliation = Number.isFinite(qty) && qty < 0;
    if (needsReconciliation) negatives += 1;

    const sku = String(itemNo).trim().toUpperCase().replace(/\s+/g, "-");
    const row = {
      tenant_id: tenantId,
      sku,
      source_item_no: String(itemNo).trim(),
      category,
      kind: mapKind(parsed.kind),
      raw_description: description,
      bar_depth_in: parsed.barDepthIn,
      bar_thickness_in: parsed.barThicknessIn,
      designation: parsed.designation,
      bearing_bar_spacing_in: parsed.bearingBarSpacingIn,
      surface: mapEnum(parsed.surface, ["serrated", "smooth", "unknown"] as const, "unknown"),
      finish: mapEnum(
        parsed.finish,
        ["bare", "unpainted", "galvanized", "painted_black", "unknown"] as const,
        "unknown",
      ),
      material: mapEnum(
        parsed.material,
        ["carbon_steel", "aluminum", "stainless", "unknown"] as const,
        "unknown",
      ),
      panel_width_in: parsed.panelWidthIn,
      panel_length_in: parsed.panelLengthIn,
      area_sqft: panelAreaSqFt(parsed.panelWidthIn, parsed.panelLengthIn),
      qty_on_hand: qty,
      qty_reserved: 0,
      needs_reconciliation: needsReconciliation,
      parse_confidence: parsed.confidence,
      parse_warnings: parsed.warnings,
      import_batch_id: batchId,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("sku", sku)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("inventory_items")
        .update(row)
        .eq("id", existing.id);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await supabase.from("inventory_items").insert(row);
      if (error) throw error;
      inserted += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        batchId,
        tenantId,
        inserted,
        updated,
        skipped,
        negatives_flagged: negatives,
        skippedRows,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
