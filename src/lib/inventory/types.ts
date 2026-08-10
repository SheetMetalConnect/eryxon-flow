/** Quantity is tracked as physical panels / pieces. */
export type QuantityUnit = "panels";

export type GratingSurface = "serrated" | "smooth" | "unknown";

export type GratingFinish =
  | "bare"
  | "unpainted"
  | "galvanized"
  | "painted_black"
  | "unknown";

export type GratingMaterial =
  | "carbon_steel"
  | "aluminum"
  | "stainless"
  | "unknown";

export type ParseConfidence = "high" | "medium" | "low" | "none";

export type ProductKind = "bar_grating" | "tread" | "unknown";

export type LoadDuty = "pedestrian" | "heavy_duty";

export type LoadKind = "uniform_psf" | "concentrated_plf";

export interface ParsedLength {
  /** Value in inches. */
  inches: number;
  /** Original matched token, if any. */
  raw?: string;
}

export interface ParsedGrating {
  raw: string;
  kind: ProductKind;
  /** Bearing bar depth (height), inches. */
  barDepthIn: number | null;
  /** Bearing bar thickness, inches. */
  barThicknessIn: number | null;
  /** NAAMM style designation, e.g. 19W4. */
  designation: string | null;
  /** Bearing-bar center spacing inferred from designation (inches), if known. */
  bearingBarSpacingIn: number | null;
  surface: GratingSurface;
  finish: GratingFinish;
  material: GratingMaterial;
  /** Panel / tread width (across span direction for treads: nosing width). */
  panelWidthIn: number | null;
  /** Panel / tread length. */
  panelLengthIn: number | null;
  confidence: ParseConfidence;
  /** Fields successfully extracted. */
  extracted: string[];
  /** Tokens / leftovers that were not classified. */
  unparsedTokens: string[];
  warnings: string[];
}

export interface SectionPropertiesPerFoot {
  /** Designation used for spacing (may be defaulted). */
  designation: string;
  barsPerFoot: number;
  /** Moment of inertia about strong axis, in^4 per foot of width. */
  I_in4_per_ft: number;
  /** Section modulus, in^3 per foot of width. */
  S_in3_per_ft: number;
  /** Approximate weight, lb/ft² (steel). */
  weight_psf: number | null;
  /** Depth used for capacity (smooth depth; serrated physical depth may be larger). */
  effectiveDepthIn: number;
  barThicknessIn: number;
}

export interface StructuralRequirement {
  spanIn: number;
  loadKind: LoadKind;
  loadValue: number;
  duty: LoadDuty;
  surface: GratingSurface;
  /** Material used for Fb / E — never cross-apply between materials. */
  material: Exclude<GratingMaterial, "unknown">;
  maxDeflectionIn: number;
  fiberStressPsi: number;
  modulusE_psi: number;
  /** Required section modulus (in^3 / ft width). */
  requiredS_in3_per_ft: number;
  /** Required moment of inertia for deflection (in^4 / ft width). */
  requiredI_in4_per_ft: number;
  /** Minimum physical bar depth after serrated / catalog adjustment (inches). */
  minBarDepthIn: number | null;
  /** Smooth-equivalent depth before serrated / catalog bump (inches). */
  smoothEquivalentDepthIn: number | null;
  /**
   * How serrated depth was handled:
   * - standard_quarter_inch: physical min = smoothEq + 0.25; capacity depth = physical - 0.25
   * - heavy_duty_next_catalog: physical min = next HD catalog size > smoothEq
   * - none: smooth surface
   */
  serratedRule: "none" | "standard_quarter_inch" | "heavy_duty_next_catalog";
  assumptions: string[];
}

export interface StructuralCheckResult {
  passes: boolean;
  reasons: string[];
  S_ratio: number | null;
  I_ratio: number | null;
  depth_ok: boolean | null;
}
