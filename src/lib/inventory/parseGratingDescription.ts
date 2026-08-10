import type {
  GratingFinish,
  GratingMaterial,
  GratingSurface,
  ParseConfidence,
  ParsedGrating,
  ProductKind,
} from "./types";
import { feetToInches, mmToInches, parseImperialMeasure } from "./units";

const DESIGNATION_RE = /\b(\d{2})\s*([WwIiAa])\s*(\d)\b/g;

/** Bearing bar spacing (inches) from NAAMM first number (sixteenths of an inch). */
export function bearingBarSpacingFromDesignation(designation: string): number | null {
  const m = /^(\d{2})[WwIiAa](\d)$/i.exec(designation.trim());
  if (!m) return null;
  return Number(m[1]) / 16;
}

function normalizeDesignation(raw: string): string {
  const m = /^(\d{2})\s*([WwIiAa])\s*(\d)$/i.exec(raw.trim());
  if (!m) return raw.trim().toUpperCase();
  return `${m[1]}${m[2].toUpperCase()}${m[3]}`;
}

function detectKind(upper: string): ProductKind {
  if (/\bTREADS?\b|\bSTAIR\s+TREADS?\b/.test(upper)) return "tread";
  if (/\bFABRICATION\b/.test(upper) && /\bTREAD/.test(upper)) return "tread";
  return "bar_grating";
}

function detectSurface(upper: string): { surface: GratingSurface; hit: boolean } {
  if (/\bSERR(?:ATED|TAED)?\b|\bSERR\b/.test(upper)) {
    return { surface: "serrated", hit: true };
  }
  if (/\bSMOOTH\b|\bPLAIN\b/.test(upper)) {
    return { surface: "smooth", hit: true };
  }
  return { surface: "unknown", hit: false };
}

function detectFinish(upper: string): { finish: GratingFinish; hit: boolean } {
  if (/\bGALVANI[sz]ED\b|\bGALV\b/.test(upper)) {
    return { finish: "galvanized", hit: true };
  }
  if (/\bPAINTED\s+BLACK\b|\bBLK\b|\bBLACK\b/.test(upper)) {
    return { finish: "painted_black", hit: true };
  }
  if (/\bUNPAINTED\b|\bUNP\b/.test(upper)) {
    return { finish: "unpainted", hit: true };
  }
  if (/\bBARE\b/.test(upper)) {
    return { finish: "bare", hit: true };
  }
  return { finish: "unknown", hit: false };
}

function detectMaterial(upper: string): { material: GratingMaterial; hit: boolean } {
  if (/\bALUMIN(?:I)?UM\b|\bALUM\b|\bALM\b/.test(upper)) {
    return { material: "aluminum", hit: true };
  }
  if (/\bSTAINLESS\b|\bSS\b|\b316\b|\b304\b/.test(upper)) {
    return { material: "stainless", hit: true };
  }
  // Default carbon steel when we have bar geometry (applied later).
  return { material: "unknown", hit: false };
}

/**
 * Extract the first depth x thickness pair.
 * Supports: 1-1/4 X 3/16, 2" X 3/8", 2X3/16, 1X3/8, WPU...2X3/16
 */
function extractBarDims(text: string): {
  depth: number | null;
  thickness: number | null;
  raw?: string;
} {
  // Prefer explicit inch marks / spaced X forms first.
  const patterns: RegExp[] = [
    // 1-1/4" X 3/16"  or  1-1/4 X 3/16
    /(\d+\s*-\s*\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*"?\s*[xX×]\s*(\d+\s*-\s*\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*"?/,
    // Compact 2X3/16 or 1X3/8 (no spaces) — thickness usually a fraction
    /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+\s*\/\s*\d+)/,
  ];

  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    const depth = parseImperialMeasure(m[1]);
    const thickness = parseImperialMeasure(m[2]);
    if (depth != null && thickness != null && depth > thickness) {
      // Guard: depth should be larger than thickness for bearing bars.
      // If reversed (rare), still accept if depth looks like bar height (>= 0.75).
      return { depth, thickness, raw: m[0] };
    }
    if (depth != null && thickness != null && depth >= 0.75) {
      return { depth, thickness, raw: m[0] };
    }
  }

  return { depth: null, thickness: null };
}

/**
 * Extract panel / tread size pairs after bar dims.
 * Handles: 3' X 24', 3X24, 2' X 20', 12" X 36", 486mm X 20', 97mm X 1219mm,
 *          11" X 36", 10-15/16 X 48", -9-3/4 X48" (typo leading dash)
 */
function extractPanelSize(
  text: string,
  kind: ProductKind,
): { width: number | null; length: number | null; raw?: string } {
  const candidates: Array<{ width: number; length: number; raw: string; score: number }> = [];

  // mm x mm or mm x feet
  const mmPair =
    /(-?\d+(?:\.\d+)?)\s*mm\s*[xX×]\s*(-?\d+(?:\.\d+)?)\s*(mm|')?/gi;
  let m: RegExpExecArray | null;
  while ((m = mmPair.exec(text)) !== null) {
    const a = Math.abs(Number(m[1]));
    const b = Math.abs(Number(m[2]));
    const bUnit = (m[3] || "mm").toLowerCase();
    const width = mmToInches(a);
    const length = bUnit === "'" ? feetToInches(b) : mmToInches(b);
    candidates.push({ width, length, raw: m[0], score: 3 });
  }

  // feet x feet: 3' X 24' or 3'X24'
  const ftPair =
    /(\d+(?:\.\d+)?)\s*'\s*[xX×]\s*(\d+(?:\.\d+)?)\s*'/gi;
  while ((m = ftPair.exec(text)) !== null) {
    candidates.push({
      width: feetToInches(Number(m[1])),
      length: feetToInches(Number(m[2])),
      raw: m[0],
      score: 4,
    });
  }

  // Compact feet without marks but typical grating panels: 3X24, 2X20 (after designation context)
  // Only treat as feet when both are small integers typical of panel ft sizes.
  const compactFt = /\b([1-4])\s*[xX×]\s*(20|24)\b/g;
  while ((m = compactFt.exec(text)) !== null) {
    candidates.push({
      width: feetToInches(Number(m[1])),
      length: feetToInches(Number(m[2])),
      raw: m[0],
      score: 2,
    });
  }

  // inch x inch: 12" X 36", 11" X 36", 10" X 36"
  // Require a closing inch mark on the second value so we don't treat "3/16 X 12\"" as a panel.
  const inchPair =
    /(-?\d+\s*-\s*\d+\s*\/\s*\d+|-?\d+(?:\.\d+)?)\s*"\s*[xX×]\s*(-?\d+\s*-\s*\d+\s*\/\s*\d+|-?\d+(?:\.\d+)?)\s*"/gi;
  while ((m = inchPair.exec(text)) !== null) {
    const a = parseImperialMeasure(m[1].replace(/^-/, ""));
    const b = parseImperialMeasure(m[2]);
    if (a == null || b == null) continue;
    // Skip bar-thickness-like first values (e.g. leftover 3/16)
    if (a <= 0.5 || b <= 0.5) continue;
    candidates.push({
      width: Math.abs(a),
      length: Math.abs(b),
      raw: m[0],
      score: kind === "tread" ? 5 : 3,
    });
  }

  // Tread style without trailing quote on first: 11 X 36, 10-15/16 X 48"
  if (kind === "tread") {
    const treadPair =
      /(-?\d+\s*-\s*\d+\s*\/\s*\d+|-?\d+(?:\.\d+)?)\s*"?\s*[xX×]\s*(-?\d+(?:\.\d+)?)\s*"?/gi;
    while ((m = treadPair.exec(text)) !== null) {
      const a = parseImperialMeasure(m[1].replace(/^-/, ""));
      const b = parseImperialMeasure(m[2]);
      if (a == null || b == null) continue;
      if (a > 5 && a < 20 && b >= 24 && b <= 60) {
        candidates.push({ width: Math.abs(a), length: Math.abs(b), raw: m[0], score: 3 });
      }
    }
  }

  if (candidates.length === 0) return { width: null, length: null };

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  // Convention: smaller dimension = width for panels; for 2x20 / 3x24 width is first.
  return { width: best.width, length: best.length, raw: best.raw };
}

function scoreConfidence(p: {
  depth: number | null;
  thickness: number | null;
  designation: string | null;
  surfaceHit: boolean;
  width: number | null;
  length: number | null;
  kind: ProductKind;
}): ParseConfidence {
  if (p.depth == null || p.thickness == null) {
    if (p.designation || p.surfaceHit) return "low";
    return "none";
  }
  const hasDes = !!p.designation;
  const hasSize = p.width != null && p.length != null;
  // Treads often omit designation; depth+thickness+surface+size is enough for stock use.
  if (p.kind === "tread" && p.surfaceHit && hasSize) return "high";
  if (hasDes && (p.surfaceHit || hasSize)) return "high";
  if (hasDes || (p.surfaceHit && hasSize)) return "medium";
  if (p.surfaceHit || hasSize) return "medium";
  return "low";
}

export interface ParseOptions {
  /** Spreadsheet Category column — helps classify treads vs panels. */
  categoryHint?: string;
}

/**
 * Parse a messy inventory Description into structured grating / tread fields.
 */
export function parseGratingDescription(
  description: string,
  options: ParseOptions = {},
): ParsedGrating {
  const raw = (description ?? "").trim();
  const extracted: string[] = [];
  const warnings: string[] = [];
  const unparsedTokens: string[] = [];

  if (!raw) {
    return {
      raw,
      kind: "unknown",
      barDepthIn: null,
      barThicknessIn: null,
      designation: null,
      bearingBarSpacingIn: null,
      surface: "unknown",
      finish: "unknown",
      material: "unknown",
      panelWidthIn: null,
      panelLengthIn: null,
      confidence: "none",
      extracted,
      unparsedTokens: [],
      warnings: ["empty description"],
    };
  }

  // Normalize common typos / noise before matching.
  let text = raw
    .replace(/\.{2,}/g, " ") // WPU...... noise
    .replace(/\bSerrtaed\b/gi, "Serrated")
    .replace(/\bBare(\d)/gi, "Bare $1") // Bare19W4
    .replace(/\s+/g, " ")
    .trim();

  const upper = text.toUpperCase();
  let kind = detectKind(upper);
  const catHint = (options.categoryHint || "").toLowerCase();
  if (kind !== "tread" && catHint.includes("tread")) {
    kind = "tread";
    extracted.push("kind");
  } else if (kind === "tread") {
    extracted.push("kind");
  }

  // Skip non-product noise rows early.
  if (/^PAINTED\s+BLACK\.?$/i.test(text) || /^FABRICATION\b/i.test(text) && !/\d/.test(text)) {
    warnings.push("non-product or fabrication note without geometry");
  }

  const dims = extractBarDims(text);
  if (dims.depth != null) extracted.push("barDepthIn");
  if (dims.thickness != null) extracted.push("barThicknessIn");

  let designation: string | null = null;
  DESIGNATION_RE.lastIndex = 0;
  const desMatch = DESIGNATION_RE.exec(text);
  if (desMatch) {
    designation = normalizeDesignation(`${desMatch[1]}${desMatch[2]}${desMatch[3]}`);
    extracted.push("designation");
  }

  const surfaceDet = detectSurface(upper);
  if (surfaceDet.hit) extracted.push("surface");

  const finishDet = detectFinish(upper);
  if (finishDet.hit) extracted.push("finish");

  const materialDet = detectMaterial(upper);
  let material = materialDet.material;
  if (materialDet.hit) {
    extracted.push("material");
  } else if (dims.depth != null) {
    material = "carbon_steel";
    extracted.push("material_default");
  }

  const panel = extractPanelSize(text, kind);
  if (panel.width != null) extracted.push("panelWidthIn");
  if (panel.length != null) extracted.push("panelLengthIn");

  // Item-code style WPU194083324 → 19W4, depth 2x3/16 already handled if present.
  const code = /\bW[PN][A-Z]?(\d{2})(\d)(\d{2})(\d{2})(\d{2,3})/i.exec(text.replace(/\./g, ""));
  if (code && !designation) {
    designation = `${code[1]}W${code[2]}`;
    extracted.push("designation");
    warnings.push("designation inferred from product code");
  }

  if (kind === "bar_grating" && surfaceDet.surface === "unknown" && designation) {
    // Many plain/smooth rows omit the word; leave unknown rather than assume.
    warnings.push("surface not stated");
  }

  if (dims.depth == null || dims.thickness == null) {
    warnings.push("missing bearing bar depth and/or thickness");
  }

  const confidence = scoreConfidence({
    depth: dims.depth,
    thickness: dims.thickness,
    designation,
    surfaceHit: surfaceDet.hit,
    width: panel.width,
    length: panel.length,
    kind,
  });

  // Rough leftover: strip known pieces for audit.
  let leftover = text;
  if (dims.raw) leftover = leftover.replace(dims.raw, " ");
  if (designation) leftover = leftover.replace(new RegExp(designation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
  if (panel.raw) leftover = leftover.replace(panel.raw, " ");
  leftover = leftover
    .replace(/\b(SERR(?:ATED|TAED)?|SERR|SMOOTH|PLAIN|BARE|UNPAINTED|UNP|GALVANI[SZ]ED|GALV|PAINTED|BLACK|BLK|ALUMIN(?:I)?UM|ALUM|STAIR|TREADS?|FABRICATION|PCS)\b/gi, " ")
    .replace(/[().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (leftover) unparsedTokens.push(leftover);

  return {
    raw,
    kind,
    barDepthIn: dims.depth,
    barThicknessIn: dims.thickness,
    designation,
    bearingBarSpacingIn: designation
      ? bearingBarSpacingFromDesignation(designation)
      : null,
    surface: surfaceDet.surface,
    finish: finishDet.finish,
    material,
    panelWidthIn: panel.width,
    panelLengthIn: panel.length,
    confidence,
    extracted,
    unparsedTokens,
    warnings,
  };
}
