import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatClockTime,
  formatElapsedSeconds,
  formatRelativeTime,
  toTimeInputValue,
} from "./time-utils";

describe("formatElapsedSeconds", () => {
  it("formats sub-minute values", () => {
    expect(formatElapsedSeconds(0)).toBe("0:00");
    expect(formatElapsedSeconds(45)).toBe("0:45");
  });

  it("formats minutes without an hour part", () => {
    expect(formatElapsedSeconds(65)).toBe("1:05");
    expect(formatElapsedSeconds(599)).toBe("9:59");
  });

  it("formats hours with zero-padded minutes and seconds", () => {
    expect(formatElapsedSeconds(3600)).toBe("1:00:00");
    expect(formatElapsedSeconds(3725)).toBe("1:02:05");
    expect(formatElapsedSeconds(36005)).toBe("10:00:05");
  });

  it("truncates fractional seconds", () => {
    expect(formatElapsedSeconds(59.9)).toBe("0:59");
  });
});

describe("formatClockTime", () => {
  const afternoon = new Date(2026, 5, 9, 14, 5);
  const morning = new Date(2026, 5, 9, 0, 30);
  const noon = new Date(2026, 5, 9, 12, 0);

  it("formats 24-hour time", () => {
    expect(formatClockTime(afternoon, true)).toBe("14:05");
    expect(formatClockTime(morning, true)).toBe("00:30");
  });

  it("formats 12-hour time with period", () => {
    expect(formatClockTime(afternoon, false)).toBe("02:05 PM");
    expect(formatClockTime(morning, false)).toBe("12:30 AM");
    expect(formatClockTime(noon, false)).toBe("12:00 PM");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats anything under a minute as now", () => {
    expect(formatRelativeTime("2026-06-09T11:59:30Z", "en")).toBe("now");
  });

  it("formats minutes and hours in the past", () => {
    expect(formatRelativeTime("2026-06-09T11:55:00Z", "en")).toBe(
      "5 minutes ago",
    );
    expect(formatRelativeTime("2026-06-09T09:00:00Z", "en")).toBe(
      "3 hours ago",
    );
  });

  it("formats whole days in the past", () => {
    expect(formatRelativeTime("2026-06-06T12:00:00Z", "en")).toBe(
      "3 days ago",
    );
  });

  it("localizes via the provided locale", () => {
    expect(formatRelativeTime("2026-06-09T11:55:00Z", "de")).toBe(
      "vor 5 Minuten",
    );
  });

  it("accepts Date instances", () => {
    expect(formatRelativeTime(new Date("2026-06-09T11:00:00Z"), "en")).toBe(
      "1 hour ago",
    );
  });
});

describe("toTimeInputValue", () => {
  it("trims database HH:MM:SS to HH:MM", () => {
    expect(toTimeInputValue("07:00:00")).toBe("07:00");
    expect(toTimeInputValue("17:30:15")).toBe("17:30");
  });

  it("returns an empty string for missing values", () => {
    expect(toTimeInputValue(null)).toBe("");
    expect(toTimeInputValue(undefined)).toBe("");
    expect(toTimeInputValue("")).toBe("");
  });
});
