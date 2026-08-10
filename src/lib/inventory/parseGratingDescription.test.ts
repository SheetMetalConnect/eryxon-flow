import { describe, expect, it } from "vitest";
import { parseGratingDescription } from "./parseGratingDescription";
import { panelAreaSqFt, parseImperialMeasure } from "./units";

describe("parseImperialMeasure", () => {
  it("parses mixed numbers and fractions", () => {
    expect(parseImperialMeasure("1-1/4")).toBeCloseTo(1.25);
    expect(parseImperialMeasure("3/16")).toBeCloseTo(0.1875);
    expect(parseImperialMeasure("2")).toBe(2);
    expect(parseImperialMeasure("10-15/16")).toBeCloseTo(10.9375);
  });
});

describe("parseGratingDescription", () => {
  it("parses classic smooth panel", () => {
    const p = parseGratingDescription(
      `1-1/2" X 1/4" X 3' X 24' Smooth 19W4`,
    );
    expect(p.barDepthIn).toBeCloseTo(1.5);
    expect(p.barThicknessIn).toBeCloseTo(0.25);
    expect(p.designation).toBe("19W4");
    expect(p.surface).toBe("smooth");
    expect(p.panelWidthIn).toBeCloseTo(36);
    expect(p.panelLengthIn).toBeCloseTo(288);
    expect(p.material).toBe("carbon_steel");
    expect(p.confidence).toBe("high");
    expect(panelAreaSqFt(p.panelWidthIn, p.panelLengthIn)).toBeCloseTo(72);
  });

  it("parses WPU-style serrated row", () => {
    const p = parseGratingDescription(
      "WPU194083324......2X3/16 19W4 Serrated  3X24 Bare",
    );
    expect(p.barDepthIn).toBeCloseTo(2);
    expect(p.barThicknessIn).toBeCloseTo(0.1875);
    expect(p.designation).toBe("19W4");
    expect(p.surface).toBe("serrated");
    expect(p.finish).toBe("bare");
    expect(p.panelWidthIn).toBeCloseTo(36);
    expect(p.panelLengthIn).toBeCloseTo(288);
  });

  it("parses typo Serrtaed", () => {
    const p = parseGratingDescription(
      `2" X 1/4" X 3' X 24' Serrtaed 19W4 Bare`,
    );
    expect(p.surface).toBe("serrated");
    expect(p.designation).toBe("19W4");
  });

  it("parses aluminum serrated", () => {
    const p = parseGratingDescription(
      `1-1/2 X 3/16 X 3' X 24' Serrated Aluminium.`,
    );
    expect(p.material).toBe("aluminum");
    expect(p.surface).toBe("serrated");
    expect(p.barDepthIn).toBeCloseTo(1.5);
  });

  it("parses 15W2 with mm width", () => {
    const p = parseGratingDescription(
      `2-1/4 X 3/8 X 486mm X 20' 15W2   Smooth`,
    );
    expect(p.designation).toBe("15W2");
    expect(p.surface).toBe("smooth");
    expect(p.panelWidthIn).toBeCloseTo(486 / 25.4, 2);
    expect(p.panelLengthIn).toBeCloseTo(240);
  });

  it("parses stair tread with mixed units", () => {
    const p = parseGratingDescription(
      `1-1/4 X 3/16 X 12" X  36" Serrated Stair Treads  19W4 UNP`,
    );
    expect(p.kind).toBe("tread");
    expect(p.surface).toBe("serrated");
    expect(p.finish).toBe("unpainted");
    expect(p.designation).toBe("19W4");
    expect(p.panelWidthIn).toBeCloseTo(12);
    expect(p.panelLengthIn).toBeCloseTo(36);
  });

  it("parses tread with mm sizes", () => {
    const p = parseGratingDescription(
      "1-1/4 X 3/16 X 97mm X 1219mm Stair Treads",
    );
    expect(p.kind).toBe("tread");
    expect(p.panelWidthIn).toBeCloseTo(97 / 25.4, 2);
    expect(p.panelLengthIn).toBeCloseTo(1219 / 25.4, 1);
  });

  it("parses galvanized and 38W4", () => {
    const p = parseGratingDescription("1-1/2 X 3/16 Serrated 38W4");
    expect(p.designation).toBe("38W4");
    expect(p.surface).toBe("serrated");
    expect(p.bearingBarSpacingIn).toBeCloseTo(38 / 16);
  });

  it("handles SERR abbreviation and UNP", () => {
    const p = parseGratingDescription("1-1/2X1/8 SERR 19W4 3'X24'  UNP");
    expect(p.surface).toBe("serrated");
    expect(p.finish).toBe("unpainted");
    expect(p.barDepthIn).toBeCloseTo(1.5);
    expect(p.barThicknessIn).toBeCloseTo(0.125);
  });

  it("uses categoryHint to classify treads without the word tread", () => {
    const p = parseGratingDescription(
      `1-1/4 X 3/16 X 11" X 36"  Serrated Galvanized`,
      { categoryHint: "Treads" },
    );
    expect(p.kind).toBe("tread");
    expect(p.confidence).toBe("high");
    expect(p.panelWidthIn).toBeCloseTo(11);
    expect(p.panelLengthIn).toBeCloseTo(36);
  });

  it("returns none/low for non-product noise", () => {
    const p = parseGratingDescription("Painted BLACK.");
    expect(p.barDepthIn).toBeNull();
    expect(["none", "low"]).toContain(p.confidence);
  });
});
