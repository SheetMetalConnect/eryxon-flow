import { describe, expect, it } from "vitest";
import { productionErrorMessage } from "./errors";

const t = ((key: string) => `#${key}`) as never;

describe("productionErrorMessage", () => {
  it("maps known database rule messages to i18n keys", () => {
    expect(productionErrorMessage(new Error("Stop active work before starting another operation"), t))
      .toBe("#production.errors.activeElsewhere");
    expect(productionErrorMessage(new Error("Previous operation must be completed first"), t))
      .toBe("#production.errors.notReleased");
  });

  it("passes unknown messages through and falls back for non-errors", () => {
    expect(productionErrorMessage(new Error("network down"), t)).toBe("network down");
    expect(productionErrorMessage(undefined, t)).toBe("#notifications.failed");
    expect(productionErrorMessage("x", t, "operations.failedToComplete")).toBe("#operations.failedToComplete");
  });
});
