import { bearingBarSpacingFromDesignation } from "./parseGratingDescription";
import type { SectionPropertiesPerFoot } from "./types";

const STEEL_DENSITY_PCI = 0.283; // lb/in³

export interface SectionInput {
  /** Physical bar depth (inches). For serrated bars this is the full bar height. */
  barDepthIn: number;
  barThicknessIn: number;
  /** NAAMM designation; defaults to 19W4 when omitted. */
  designation?: string | null;
  /**
   * When true, capacity uses (depth - 0.25") per NAAMM serrated practice
   * (serrated bars are 1/4" deeper for the same capacity as smooth).
   */
  capacityAsSerrated?: boolean;
}

/**
 * Approximate welded-grating section properties **per foot of width**.
 *
 * Model: rectangular bearing bars only (cross bars ignored for S/I — standard
 * chart simplification for strong-axis bending). Bars per foot = 12 / spacing,
 * where spacing comes from the NAAMM designation first number (n/16 inch).
 */
export function estimateSectionPropertiesPerFoot(
  input: SectionInput,
): SectionPropertiesPerFoot {
  const designation = (input.designation || "19W4").toUpperCase();
  const spacing =
    bearingBarSpacingFromDesignation(designation) ??
    bearingBarSpacingFromDesignation("19W4")!;

  const barsPerFoot = 12 / spacing;
  const physicalDepth = input.barDepthIn;
  const effectiveDepth = input.capacityAsSerrated
    ? Math.max(physicalDepth - 0.25, 0)
    : physicalDepth;
  const t = input.barThicknessIn;

  // Single rectangular bar: I = b d^3 / 12, S = b d^2 / 6
  const I_bar = (t * effectiveDepth ** 3) / 12;
  const S_bar = (t * effectiveDepth ** 2) / 6;

  const I_in4_per_ft = I_bar * barsPerFoot;
  const S_in3_per_ft = S_bar * barsPerFoot;

  const volumePerFt2 = barsPerFoot * t * physicalDepth; // in³ per ft²
  const weight_psf = volumePerFt2 * STEEL_DENSITY_PCI;

  return {
    designation,
    barsPerFoot,
    I_in4_per_ft,
    S_in3_per_ft,
    weight_psf,
    effectiveDepthIn: effectiveDepth,
    barThicknessIn: t,
  };
}
