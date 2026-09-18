import { describe, expect, it } from "vitest";
import { getSequentialReleaseSetting, isReleased, mergeSequentialReleaseSetting } from "./release";

const step = (part: string, sequence: number, status = "not_started") => ({ part: { id: part }, sequence, status });

describe("isReleased", () => {
  it("first step is always released", () => {
    expect(isReleased(step("a", 1), [step("a", 1), step("a", 2)])).toBe(true);
  });
  it("released when every earlier step is completed", () => {
    expect(isReleased(step("a", 3), [step("a", 1, "completed"), step("a", 2, "completed"), step("a", 3)])).toBe(true);
  });
  it("blocked by a not started or on hold predecessor", () => {
    expect(isReleased(step("a", 2), [step("a", 1), step("a", 2)])).toBe(false);
    expect(isReleased(step("a", 2), [step("a", 1, "on_hold"), step("a", 2)])).toBe(false);
    expect(isReleased(step("a", 2), [step("a", 1, "in_progress"), step("a", 2)])).toBe(false);
  });
  it("ignores other parts", () => {
    expect(isReleased(step("a", 2), [step("b", 1), step("a", 1, "completed"), step("a", 2)])).toBe(true);
  });
});

describe("sequential release flag", () => {
  it("defaults to off and round-trips through feature_flags", () => {
    expect(getSequentialReleaseSetting(null)).toBe(false);
    expect(getSequentialReleaseSetting({ other: true })).toBe(false);
    const flags = mergeSequentialReleaseSetting({ other: true }, true);
    expect(flags).toEqual({ other: true, sequentialRelease: true });
    expect(getSequentialReleaseSetting(flags)).toBe(true);
  });
});
