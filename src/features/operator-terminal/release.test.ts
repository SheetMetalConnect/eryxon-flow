import { describe, expect, it } from "vitest";
import { deriveOperationFlowState, getSequentialReleaseSetting, isReleased, mergeSequentialReleaseSetting } from "./release";

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

describe("deriveOperationFlowState", () => {
  it("uses route completion for buffer and expected", () => {
    const operations = [step("a", 1), step("a", 2)];
    expect(deriveOperationFlowState(operations[0], operations)).toBe("in_buffer");
    expect(deriveOperationFlowState(operations[1], operations)).toBe("expected");
  });

  it("keeps execution states explicit", () => {
    expect(deriveOperationFlowState(step("a", 1, "in_progress"), [])).toBe("active");
    expect(deriveOperationFlowState(step("a", 1, "on_hold"), [])).toBe("on_hold");
    expect(deriveOperationFlowState(step("a", 1, "completed"), [])).toBe("completed");
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
