/**
 * Generate SQL seed values for grating_section_props from the Phase 1 model.
 * Usage: npx tsx scripts/generate-section-props-seed.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { estimateSectionPropertiesPerFoot } from "../src/lib/inventory/sectionProperties.ts";
import { bearingBarSpacingFromDesignation } from "../src/lib/inventory/parseGratingDescription.ts";

const depths = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4, 4.5];
const thicknesses = [0.125, 0.1875, 0.25, 0.375];
const designations = ["19W4", "15W2", "19W2", "38W4"];
const surfaces = ["smooth", "serrated"] as const;

const valueRows: string[] = [];

for (const des of designations) {
  for (const d of depths) {
    for (const t of thicknesses) {
      if (t >= d) continue;
      for (const surface of surfaces) {
        const s = estimateSectionPropertiesPerFoot({
          barDepthIn: d,
          barThicknessIn: t,
          designation: des,
          capacityAsSerrated: surface === "serrated",
        });
        const spacing = bearingBarSpacingFromDesignation(des);
        valueRows.push(
          `('${des}', ${d}, ${t}, '${surface}', 'carbon_steel', ${spacing}, ${s.barsPerFoot.toFixed(6)}, ${s.I_in4_per_ft.toFixed(6)}, ${s.S_in3_per_ft.toFixed(6)}, ${(s.weight_psf ?? 0).toFixed(4)}, ${s.effectiveDepthIn.toFixed(4)}, 'rectangular bar model — Phase 1')`,
        );
      }
    }
  }
}

const sql = `-- Seed grating_section_props from Phase 1 rectangular-bar model.
-- Idempotent upsert on unique (designation, depth, thickness, surface, material).

INSERT INTO public.grating_section_props (
  designation, bar_depth_in, bar_thickness_in, surface, material,
  bearing_bar_spacing_in, bars_per_foot, i_in4_per_ft, s_in3_per_ft,
  weight_psf, effective_depth_in, notes
) VALUES
${valueRows.join(",\n")}
ON CONFLICT (designation, bar_depth_in, bar_thickness_in, surface, material)
DO UPDATE SET
  bearing_bar_spacing_in = EXCLUDED.bearing_bar_spacing_in,
  bars_per_foot = EXCLUDED.bars_per_foot,
  i_in4_per_ft = EXCLUDED.i_in4_per_ft,
  s_in3_per_ft = EXCLUDED.s_in3_per_ft,
  weight_psf = EXCLUDED.weight_psf,
  effective_depth_in = EXCLUDED.effective_depth_in,
  notes = EXCLUDED.notes,
  updated_at = now();
`;

const outDir = resolve(import.meta.dirname, "../supabase/migrations");
const outPath = resolve(outDir, "20260807180100_seed_grating_section_props.sql");
writeFileSync(outPath, sql, "utf8");
mkdirSync(resolve(import.meta.dirname, "../data/inventory"), { recursive: true });
console.log(`Wrote ${valueRows.length} rows → ${outPath}`);
