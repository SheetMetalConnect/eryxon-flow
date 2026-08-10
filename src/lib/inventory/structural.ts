import { estimateSectionPropertiesPerFoot } from "./sectionProperties";
import {
  getMaterialProperties,
  nextHeavyDutyCatalogDepth,
} from "./materialProperties";
import type {
  GratingMaterial,
  GratingSurface,
  LoadDuty,
  LoadKind,
  SectionPropertiesPerFoot,
  StructuralCheckResult,
  StructuralRequirement,
} from "./types";

export {
  FB_CARBON_STEEL_PSI,
  E_STEEL_PSI,
  MATERIAL_PROPERTIES,
  getMaterialProperties,
  nextHeavyDutyCatalogDepth,
  HEAVY_DUTY_CATALOG_DEPTHS_IN,
} from "./materialProperties";

export interface RequirementInput {
  /** Clear span between supports, inches. */
  spanIn: number;
  loadKind: LoadKind;
  /** Uniform: psf. Concentrated: lb per foot of width. */
  loadValue: number;
  /**
   * Required. Structural Fb/E are taken from this material only.
   * Passing `unknown` throws — carbon-steel values are never applied to aluminum.
   */
  material: GratingMaterial;
  duty?: LoadDuty;
  surface?: GratingSurface;
  /** Override max deflection (inches). If omitted, duty policy applies. */
  maxDeflectionIn?: number;
  /**
   * Optional overrides — only for lab/sensitivity tests.
   * Production callers should omit these so material tables are authoritative.
   */
  fiberStressPsi?: number;
  modulusE_psi?: number;
}

/**
 * Maximum allowable deflection policy:
 * - pedestrian (standard duty): 0.25"
 * - heavy_duty (vehicular): min(0.125", L/400)
 */
export function maxDeflectionInches(duty: LoadDuty, spanIn: number): number {
  if (duty === "heavy_duty") {
    return Math.min(0.125, spanIn / 400);
  }
  return 0.25;
}

/**
 * Compute required S and I per foot of width for a simply-supported grating panel.
 *
 * Material Fb / E (mandatory, NAAMM chart values):
 * - Carbon steel standard (pedestrian): ASTM A1011 Type B → Fb = 18,000 psi, E = 29e6
 * - Carbon steel heavy (vehicular):     ASTM A1018 Gr 36  → Fb = 20,000 psi, E = 29e6
 * - Stainless:     Fb = 20,000 psi, E = 28,000,000 psi
 * - Aluminum:      Fb = 12,000 psi, E = 10,000,000 psi
 *
 * Serrated depth rules:
 * - Standard duty (pedestrian): min physical depth = smoothEq + 1/4";
 *   capacity uses physical depth − 1/4".
 * - Heavy duty: compute smooth required depth, then take the next greater
 *   depth from the heavy-duty catalog (e.g. 3" → 3-1/2").
 */
export function computeStructuralRequirement(
  input: RequirementInput,
): StructuralRequirement {
  const duty = input.duty ?? "pedestrian";
  const props = getMaterialProperties(input.material, duty);
  const surface = input.surface ?? "smooth";
  const Fb = input.fiberStressPsi ?? props.Fb_psi;
  const E = input.modulusE_psi ?? props.E_psi;
  const L = input.spanIn;
  const material = props.material;

  const assumptions: string[] = [
    "Simply-supported span; strong-axis bending of bearing bars only",
    `Material = ${props.label} → Fb = ${Fb.toLocaleString()} psi, E = ${E.toLocaleString()} psi (${props.specNote})`,
    "Cross bars neglected for S/I (standard chart simplification)",
    "Quantity unit for stock is panels/pieces; area derived from panel W×L",
    "Material properties are never cross-applied (aluminum must not use steel Fb/E)",
    "Carbon steel Fb is duty-dependent: 18 ksi standard / 20 ksi heavy — never a blanket 20 ksi",
  ];

  if (L <= 0) {
    throw new Error("spanIn must be positive");
  }
  if (input.loadValue <= 0) {
    throw new Error("loadValue must be positive");
  }

  const maxDeflectionIn =
    input.maxDeflectionIn ?? maxDeflectionInches(duty, L);
  assumptions.push(
    duty === "heavy_duty"
      ? `Heavy-duty deflection limit = min(0.125\", L/400) = ${maxDeflectionIn.toFixed(4)}\"`
      : `Pedestrian deflection limit = 0.25\"`,
  );

  let M_inlb_per_ft: number;
  let requiredI: number;

  if (input.loadKind === "uniform_psf") {
    const w_lb_per_in = input.loadValue / 12; // per foot of width
    M_inlb_per_ft = (w_lb_per_in * L ** 2) / 8;
    requiredI =
      (5 * w_lb_per_in * L ** 4) / (384 * E * maxDeflectionIn);
    assumptions.push(
      `Uniform load ${input.loadValue} psf → w = ${w_lb_per_in.toFixed(4)} lb/in per ft width`,
      "M = w L² / 8; I from δ = 5 w L⁴ / (384 E I)",
    );
  } else {
    const P = input.loadValue; // lb per foot of width
    M_inlb_per_ft = (P * L) / 4;
    requiredI = (P * L ** 3) / (48 * E * maxDeflectionIn);
    assumptions.push(
      `Concentrated midspan load ${P} lb/ft of width`,
      "M = P L / 4; I from δ = P L³ / (48 E I)",
    );
  }

  const requiredS = M_inlb_per_ft / Fb;

  // Depth hint assumes 3/16" bars @ 19W4 spacing — guidance + serrated rules.
  let smoothEquivalentDepthIn: number | null = null;
  let minBarDepthIn: number | null = null;
  let serratedRule: StructuralRequirement["serratedRule"] = "none";

  const tRef = 3 / 16;
  const spacing19 = 19 / 16;
  const barsPerFoot = 12 / spacing19;
  const denom = barsPerFoot * tRef;
  if (denom > 0) {
    smoothEquivalentDepthIn = Math.sqrt((6 * requiredS) / denom);
    assumptions.push(
      "Depth hint assumes 3/16\" bars at 19W4 spacing (guidance; inventory uses actual dims)",
    );

    if (surface === "serrated" && duty === "heavy_duty") {
      serratedRule = "heavy_duty_next_catalog";
      minBarDepthIn = nextHeavyDutyCatalogDepth(smoothEquivalentDepthIn);
      if (minBarDepthIn == null) {
        assumptions.push(
          "Serrated heavy-duty: smooth required depth exceeds heavy-duty catalog — no next size",
        );
      } else {
        assumptions.push(
          `Serrated heavy-duty: next catalog depth > ${smoothEquivalentDepthIn.toFixed(3)}" → ${minBarDepthIn}"`,
        );
      }
    } else if (surface === "serrated") {
      serratedRule = "standard_quarter_inch";
      minBarDepthIn = smoothEquivalentDepthIn + 0.25;
      assumptions.push(
        "Serrated standard duty: physical depth ≥ smooth-equivalent + 1/4\"; capacity depth = physical − 1/4\"",
      );
    } else {
      minBarDepthIn = smoothEquivalentDepthIn;
    }
  }

  return {
    spanIn: L,
    loadKind: input.loadKind,
    loadValue: input.loadValue,
    duty,
    surface,
    material,
    maxDeflectionIn,
    fiberStressPsi: Fb,
    modulusE_psi: E,
    requiredS_in3_per_ft: requiredS,
    requiredI_in4_per_ft: requiredI,
    minBarDepthIn,
    smoothEquivalentDepthIn,
    serratedRule,
    assumptions,
  };
}

export function checkSectionAgainstRequirement(
  section: SectionPropertiesPerFoot,
  req: StructuralRequirement,
  physicalDepthIn?: number,
): StructuralCheckResult {
  const reasons: string[] = [];
  const S_ratio =
    req.requiredS_in3_per_ft > 0
      ? section.S_in3_per_ft / req.requiredS_in3_per_ft
      : null;
  const I_ratio =
    req.requiredI_in4_per_ft > 0
      ? section.I_in4_per_ft / req.requiredI_in4_per_ft
      : null;

  const s_ok = S_ratio != null && S_ratio >= 1;
  const i_ok = I_ratio != null && I_ratio >= 1;
  if (!s_ok) {
    reasons.push(
      `Section modulus shortfall (S=${section.S_in3_per_ft.toFixed(3)} < ${req.requiredS_in3_per_ft.toFixed(3)} in³/ft)`,
    );
  }
  if (!i_ok) {
    reasons.push(
      `Stiffness shortfall (I=${section.I_in4_per_ft.toFixed(3)} < ${req.requiredI_in4_per_ft.toFixed(3)} in⁴/ft)`,
    );
  }

  let depth_ok: boolean | null = null;
  if (req.minBarDepthIn != null && physicalDepthIn != null) {
    depth_ok = physicalDepthIn + 1e-9 >= req.minBarDepthIn;
    if (!depth_ok) {
      reasons.push(
        `Bar depth ${physicalDepthIn}\" < required ${req.minBarDepthIn.toFixed(3)}\" (${req.serratedRule})`,
      );
    }
  }

  const passes = s_ok && i_ok && depth_ok !== false;
  if (passes) reasons.push("Meets strength and deflection requirements");

  return { passes, reasons, S_ratio, I_ratio, depth_ok };
}

/**
 * Build section props for an inventory candidate and test against a requirement.
 *
 * Candidate material must match the requirement material — aluminum stock is
 * never checked with steel Fb/E.
 *
 * Serrated capacity depth (−1/4\") applies only for standard-duty serrated.
 * Heavy-duty serrated uses catalog depth selection on the requirement side.
 */
export function evaluateInventoryCandidate(
  candidate: {
    barDepthIn: number;
    barThicknessIn: number;
    designation?: string | null;
    surface: GratingSurface;
    material: GratingMaterial;
  },
  req: StructuralRequirement,
): StructuralCheckResult & { section: SectionPropertiesPerFoot | null } {
  if (candidate.material === "unknown") {
    return {
      passes: false,
      reasons: [
        "Candidate material is unknown — structural check refused (no steel Fb/E fallback)",
      ],
      S_ratio: null,
      I_ratio: null,
      depth_ok: null,
      section: null,
    };
  }

  if (candidate.material !== req.material) {
    return {
      passes: false,
      reasons: [
        `Material mismatch: candidate is ${candidate.material}, requirement is ${req.material}`,
      ],
      S_ratio: null,
      I_ratio: null,
      depth_ok: null,
      section: null,
    };
  }

  const capacityAsSerrated =
    candidate.surface === "serrated" &&
    req.serratedRule === "standard_quarter_inch";

  const section = estimateSectionPropertiesPerFoot({
    barDepthIn: candidate.barDepthIn,
    barThicknessIn: candidate.barThicknessIn,
    designation: candidate.designation,
    capacityAsSerrated,
  });
  const check = checkSectionAgainstRequirement(
    section,
    req,
    candidate.barDepthIn,
  );
  return { ...check, section };
}
