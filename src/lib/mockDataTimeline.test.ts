import { describe, expect, it } from "vitest";

import {
  createDutchFactoryCalendar,
  createMockDataTimeline,
  createPlannedWindow,
} from "./mockDataTimeline";

const reference = new Date("2026-09-19T11:30:00.000Z");

describe("mock data timeline", () => {
  it("keeps active work in the future while preserving completed history", () => {
    const timeline = createMockDataTimeline(reference);

    expect(timeline.jobs.completed.dueAt).toBe("2026-09-04T00:00:00.000Z");
    expect(timeline.jobs.inProgress.map((job) => job.dueAt)).toEqual([
      "2026-09-28T00:00:00.000Z",
      "2026-10-05T00:00:00.000Z",
      "2026-10-12T00:00:00.000Z",
      "2026-10-26T00:00:00.000Z",
    ]);
    expect(timeline.jobs.notStarted.dueAt).toBe("2026-11-09T00:00:00.000Z");
    expect(new Date(timeline.timeEntriesFrom).getTime()).toBeLessThan(reference.getTime());
    expect(new Date(timeline.quantityRecordsFrom).getTime()).toBeLessThan(reference.getTime());
    expect(new Date(timeline.issuesFrom).getTime()).toBeLessThan(reference.getTime());
  });

  it("plans unfinished operations after the reference date", () => {
    const planned = createPlannedWindow({
      reference,
      dueAt: "2026-10-03T00:00:00.000Z",
      sequence: 20,
      status: "not_started",
      estimatedMinutes: 90,
    });

    expect(planned).toEqual({
      plannedStart: "2026-09-29T08:00:00.000Z",
      plannedEnd: "2026-09-29T09:30:00.000Z",
    });
  });

  it("moves active work from a weekend to the next working day", () => {
    const planned = createPlannedWindow({
      reference,
      dueAt: "2026-09-28T00:00:00.000Z",
      sequence: 20,
      status: "in_progress",
      estimatedMinutes: 60,
    });

    expect(planned.plannedStart).toBe("2026-09-21T08:00:00.000Z");
  });

  it("builds a rolling Dutch factory calendar", () => {
    const calendar = createDutchFactoryCalendar(reference);

    expect(calendar.length).toBeGreaterThan(10);
    expect(calendar.every((entry) => entry.date >= "2026-09-19")).toBe(true);
    expect(calendar.some((entry) => entry.date === "2026-12-25")).toBe(true);
    expect(calendar.some((entry) => entry.date === "2027-12-25")).toBe(true);
  });
});
