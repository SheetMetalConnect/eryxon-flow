import { describe, expect, it } from "vitest";
import { estimateSectionPropertiesPerFoot } from "./sectionProperties";
import {
  checkSectionAgainstRequirement,
  computeStructuralRequirement,
  evaluateInventoryCandidate,
  getMaterialProperties,
  maxDeflectionInches,
  nextHeavyDutyCatalogDepth,
} from "./structural";

describe("material properties", () => {
  it("uses duty-dependent Fb for carbon steel", () => {
    expect(getMaterialProperties("carbon_steel", "pedestrian")).toMatchObject({
      Fb_psi: 18_000,
      E_psi: 29_000_000,
    });
    expect(getMaterialProperties("carbon_steel", "heavy_duty")).toMatchObject({
      Fb_psi: 20_000,
      E_psi: 29_000_000,
    });
  });

  it("exposes stainless and aluminum constants (duty-independent Fb)", () => {
    expect(getMaterialProperties("stainless", "pedestrian")).toMatchObject({
      Fb_psi: 20_000,
      E_psi: 28_000_000,
    });
    expect(getMaterialProperties("aluminum", "heavy_duty")).toMatchObject({
      Fb_psi: 12_000,
      E_psi: 10_000_000,
    });
  });

  it("refuses unknown material (no steel fallback)", () => {
    expect(() => getMaterialProperties("unknown")).toThrow(/unknown material/i);
    expect(() =>
      computeStructuralRequirement({
        spanIn: 36,
        loadKind: "uniform_psf",
        loadValue: 100,
        material: "unknown",
      }),
    ).toThrow(/unknown material/i);
  });
});

describe("maxDeflectionInches", () => {
  it("uses 1/4\" for pedestrian", () => {
    expect(maxDeflectionInches("pedestrian", 48)).toBe(0.25);
  });

  it("uses min(0.125, L/400) for heavy duty", () => {
    expect(maxDeflectionInches("heavy_duty", 48)).toBeCloseTo(0.12);
    expect(maxDeflectionInches("heavy_duty", 60)).toBe(0.125);
  });
});

describe("nextHeavyDutyCatalogDepth", () => {
  it("picks the next greater catalog size", () => {
    expect(nextHeavyDutyCatalogDepth(3)).toBe(3.5);
    expect(nextHeavyDutyCatalogDepth(2.9)).toBe(3);
    expect(nextHeavyDutyCatalogDepth(1.25)).toBe(1.5);
  });
});

describe("section properties", () => {
  it("estimates S/I for 1-1/4 x 3/16 19W4 smooth", () => {
    const s = estimateSectionPropertiesPerFoot({
      barDepthIn: 1.25,
      barThicknessIn: 3 / 16,
      designation: "19W4",
    });
    expect(s.barsPerFoot).toBeCloseTo((12 * 16) / 19, 3);
    const S_bar = (0.1875 * 1.25 ** 2) / 6;
    expect(s.S_in3_per_ft).toBeCloseTo(S_bar * s.barsPerFoot, 5);
  });

  it("standard-duty serrated: capacity depth = physical − 1/4\"", () => {
    const smooth = estimateSectionPropertiesPerFoot({
      barDepthIn: 1.25,
      barThicknessIn: 3 / 16,
      designation: "19W4",
    });
    const serr = estimateSectionPropertiesPerFoot({
      barDepthIn: 1.5,
      barThicknessIn: 3 / 16,
      designation: "19W4",
      capacityAsSerrated: true,
    });
    expect(serr.effectiveDepthIn).toBeCloseTo(1.25);
    expect(serr.S_in3_per_ft).toBeCloseTo(smooth.S_in3_per_ft);
  });
});

describe("computeStructuralRequirement", () => {
  it("uses carbon steel Fb=18ksi for standard/pedestrian duty", () => {
    const req = computeStructuralRequirement({
      spanIn: 36,
      loadKind: "uniform_psf",
      loadValue: 100,
      duty: "pedestrian",
      surface: "smooth",
      material: "carbon_steel",
    });
    expect(req.fiberStressPsi).toBe(18_000);
    expect(req.modulusE_psi).toBe(29_000_000);
    expect(req.material).toBe("carbon_steel");
    expect(req.maxDeflectionIn).toBe(0.25);
    const w = 100 / 12;
    const M = (w * 36 ** 2) / 8;
    expect(req.requiredS_in3_per_ft).toBeCloseTo(M / 18_000, 6);
  });

  it("uses carbon steel Fb=20ksi for heavy/vehicular duty", () => {
    const req = computeStructuralRequirement({
      spanIn: 48,
      loadKind: "uniform_psf",
      loadValue: 200,
      duty: "heavy_duty",
      surface: "smooth",
      material: "carbon_steel",
    });
    expect(req.fiberStressPsi).toBe(20_000);
    expect(req.modulusE_psi).toBe(29_000_000);
    const w = 200 / 12;
    const M = (w * 48 ** 2) / 8;
    expect(req.requiredS_in3_per_ft).toBeCloseTo(M / 20_000, 6);
  });

  it("standard carbon steel requires more S than heavy for the same load (lower Fb)", () => {
    const base = {
      spanIn: 36,
      loadKind: "uniform_psf" as const,
      loadValue: 100,
      surface: "smooth" as const,
      material: "carbon_steel" as const,
    };
    const standard = computeStructuralRequirement({
      ...base,
      duty: "pedestrian",
      maxDeflectionIn: 0.25, // isolate Fb effect from deflection policy
    });
    const heavy = computeStructuralRequirement({
      ...base,
      duty: "heavy_duty",
      maxDeflectionIn: 0.25,
    });
    expect(standard.requiredS_in3_per_ft).toBeGreaterThan(
      heavy.requiredS_in3_per_ft,
    );
  });

  it("uses aluminum Fb=12ksi and E=10e6 (not steel)", () => {
    const steel = computeStructuralRequirement({
      spanIn: 36,
      loadKind: "uniform_psf",
      loadValue: 100,
      material: "carbon_steel",
      surface: "smooth",
    });
    const alum = computeStructuralRequirement({
      spanIn: 36,
      loadKind: "uniform_psf",
      loadValue: 100,
      material: "aluminum",
      surface: "smooth",
    });
    expect(alum.fiberStressPsi).toBe(12_000);
    expect(alum.modulusE_psi).toBe(10_000_000);
    // Lower Fb → higher required S; lower E → higher required I
    expect(alum.requiredS_in3_per_ft).toBeGreaterThan(steel.requiredS_in3_per_ft);
    expect(alum.requiredI_in4_per_ft).toBeGreaterThan(steel.requiredI_in4_per_ft);
  });

  it("uses stainless E=28e6", () => {
    const req = computeStructuralRequirement({
      spanIn: 36,
      loadKind: "uniform_psf",
      loadValue: 100,
      material: "stainless",
    });
    expect(req.fiberStressPsi).toBe(20_000);
    expect(req.modulusE_psi).toBe(28_000_000);
  });

  it("standard serrated bumps min depth by 1/4\"", () => {
    const smooth = computeStructuralRequirement({
      spanIn: 36,
      loadKind: "uniform_psf",
      loadValue: 100,
      surface: "smooth",
      material: "carbon_steel",
      duty: "pedestrian",
    });
    const serr = computeStructuralRequirement({
      spanIn: 36,
      loadKind: "uniform_psf",
      loadValue: 100,
      surface: "serrated",
      material: "carbon_steel",
      duty: "pedestrian",
    });
    expect(serr.serratedRule).toBe("standard_quarter_inch");
    expect(serr.minBarDepthIn).toBeCloseTo(
      (smooth.minBarDepthIn ?? 0) + 0.25,
      5,
    );
  });

  it("heavy-duty serrated uses next catalog depth", () => {
    const req = computeStructuralRequirement({
      spanIn: 48,
      loadKind: "uniform_psf",
      loadValue: 300,
      surface: "serrated",
      material: "carbon_steel",
      duty: "heavy_duty",
    });
    expect(req.serratedRule).toBe("heavy_duty_next_catalog");
    expect(req.smoothEquivalentDepthIn).not.toBeNull();
    expect(req.minBarDepthIn).toBe(
      nextHeavyDutyCatalogDepth(req.smoothEquivalentDepthIn!),
    );
    expect(req.minBarDepthIn!).toBeGreaterThan(req.smoothEquivalentDepthIn!);
  });

  it("passes a sufficiently deep inventory bar (same material)", () => {
    const req = computeStructuralRequirement({
      spanIn: 24,
      loadKind: "uniform_psf",
      loadValue: 50,
      surface: "smooth",
      duty: "pedestrian",
      material: "carbon_steel",
    });
    const result = evaluateInventoryCandidate(
      {
        barDepthIn: 1.25,
        barThicknessIn: 3 / 16,
        designation: "19W4",
        surface: "smooth",
        material: "carbon_steel",
      },
      req,
    );
    expect(result.passes).toBe(true);
    expect(result.S_ratio).toBeGreaterThan(1);
  });

  it("rejects aluminum candidate against steel requirement", () => {
    const req = computeStructuralRequirement({
      spanIn: 24,
      loadKind: "uniform_psf",
      loadValue: 50,
      material: "carbon_steel",
    });
    const result = evaluateInventoryCandidate(
      {
        barDepthIn: 1.5,
        barThicknessIn: 3 / 16,
        designation: "19W4",
        surface: "smooth",
        material: "aluminum",
      },
      req,
    );
    expect(result.passes).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/material mismatch/i);
  });

  it("fails a shallow bar on longer span / higher load", () => {
    const req = computeStructuralRequirement({
      spanIn: 60,
      loadKind: "uniform_psf",
      loadValue: 200,
      surface: "smooth",
      material: "carbon_steel",
    });
    const section = estimateSectionPropertiesPerFoot({
      barDepthIn: 0.75,
      barThicknessIn: 3 / 16,
      designation: "19W4",
    });
    const check = checkSectionAgainstRequirement(section, req, 0.75);
    expect(check.passes).toBe(false);
  });
});
