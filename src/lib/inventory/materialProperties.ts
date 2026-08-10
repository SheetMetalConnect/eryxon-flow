import type { GratingMaterial, LoadDuty } from "./types";

/** NAAMM chart material constants — do not substitute across materials. */
export interface MaterialProperties {
  material: Exclude<GratingMaterial, "unknown">;
  /** Allowable fiber stress Fb (psi) — may depend on duty for carbon steel. */
  Fb_psi: number;
  /** Modulus of elasticity E (psi). */
  E_psi: number;
  label: string;
  /** Spec note for audit / UI. */
  specNote: string;
}

/** Carbon steel E (both duties). */
export const E_CARBON_STEEL_PSI = 29_000_000;

/**
 * Carbon steel allowable fiber stress by duty (NAAMM):
 * - Standard / pedestrian: ASTM A1011 Type B → Fb = 18,000 psi
 * - Heavy / vehicular: ASTM A1018 Grade 36 → Fb = 20,000 psi
 */
export const FB_CARBON_STEEL_STANDARD_PSI = 18_000;
export const FB_CARBON_STEEL_HEAVY_PSI = 20_000;

export const FB_STAINLESS_PSI = 20_000;
export const E_STAINLESS_PSI = 28_000_000;

export const FB_ALUMINUM_PSI = 12_000;
export const E_ALUMINUM_PSI = 10_000_000;

/**
 * Resolve material properties for a given duty class.
 * Throws if material is unknown — never silently apply steel Fb/E to aluminum.
 *
 * Carbon steel Fb is duty-dependent; stainless and aluminum Fb do not change with duty.
 */
export function getMaterialProperties(
  material: GratingMaterial,
  duty: LoadDuty = "pedestrian",
): MaterialProperties {
  if (material === "unknown") {
    throw new Error(
      "Structural checks require a known material (carbon_steel | stainless | aluminum). " +
        "Refusing to apply carbon-steel Fb/E to an unknown material.",
    );
  }

  if (material === "carbon_steel") {
    if (duty === "heavy_duty") {
      return {
        material: "carbon_steel",
        Fb_psi: FB_CARBON_STEEL_HEAVY_PSI,
        E_psi: E_CARBON_STEEL_PSI,
        label: "Carbon Steel (Heavy Duty)",
        specNote: "ASTM A1018 Grade 36 — Fb = 20,000 psi",
      };
    }
    return {
      material: "carbon_steel",
      Fb_psi: FB_CARBON_STEEL_STANDARD_PSI,
      E_psi: E_CARBON_STEEL_PSI,
      label: "Carbon Steel (Standard Duty)",
      specNote: "ASTM A1011 Type B — Fb = 18,000 psi",
    };
  }

  if (material === "stainless") {
    return {
      material: "stainless",
      Fb_psi: FB_STAINLESS_PSI,
      E_psi: E_STAINLESS_PSI,
      label: "Stainless Steel",
      specNote: "Fb = 20,000 psi, E = 28,000,000 psi",
    };
  }

  return {
    material: "aluminum",
    Fb_psi: FB_ALUMINUM_PSI,
    E_psi: E_ALUMINUM_PSI,
    label: "Aluminum",
    specNote: "Fb = 12,000 psi, E = 10,000,000 psi",
  };
}

/** @deprecated Prefer getMaterialProperties(material, duty).Fb_psi */
export const FB_CARBON_STEEL_PSI = FB_CARBON_STEEL_STANDARD_PSI;
/** @deprecated Prefer getMaterialProperties('carbon_steel', duty).E_psi */
export const E_STEEL_PSI = E_CARBON_STEEL_PSI;

/** Static snapshot table (standard-duty carbon steel) for docs / exports. */
export const MATERIAL_PROPERTIES = {
  carbon_steel_standard: getMaterialProperties("carbon_steel", "pedestrian"),
  carbon_steel_heavy: getMaterialProperties("carbon_steel", "heavy_duty"),
  stainless: getMaterialProperties("stainless"),
  aluminum: getMaterialProperties("aluminum"),
} as const;

/**
 * Standard heavy-duty (MBG 532-class) bearing-bar depths (inches), ascending.
 * Used when serrated + heavy_duty: pick the next catalog depth strictly greater
 * than the smooth-equivalent required depth.
 */
export const HEAVY_DUTY_CATALOG_DEPTHS_IN: readonly number[] = [
  1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7,
] as const;

/**
 * Next catalog depth strictly greater than `requiredSmoothDepthIn`.
 * Example: required 3.0 → returns 3.5.
 */
export function nextHeavyDutyCatalogDepth(
  requiredSmoothDepthIn: number,
): number | null {
  if (!Number.isFinite(requiredSmoothDepthIn) || requiredSmoothDepthIn < 0) {
    return null;
  }
  for (const d of HEAVY_DUTY_CATALOG_DEPTHS_IN) {
    if (d > requiredSmoothDepthIn + 1e-9) return d;
  }
  return null;
}
