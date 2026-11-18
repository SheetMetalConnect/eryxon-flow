import { describe, expect, it } from "vitest";
import {
  buildActiveJobProgressSummaries,
  type ActiveJobProgressJob,
  summarizeActiveJobProgress,
} from "./activeJobProgress";

describe("buildActiveJobProgressSummaries", () => {
  it("calculates completion percentages from nested operations", () => {
    const jobs: ActiveJobProgressJob[] = [
      {
        id: "job-1",
        job_number: "JOB-001",
        customer: "Acme",
        status: "in_progress",
        due_date: "2026-05-30T00:00:00.000Z",
        due_date_override: null,
        parts: [
          {
            operations: [
              { status: "completed" },
              { status: "completed" },
              { status: "in_progress" },
            ],
          },
        ],
      },
    ];

    expect(buildActiveJobProgressSummaries(jobs)).toEqual([
      expect.objectContaining({
        jobNumber: "JOB-001",
        totalOperations: 3,
        completedOperations: 2,
        completionPercentage: 67,
      }),
    ]);
  });

  it("keeps zero-operation jobs at zero percent", () => {
    const jobs: ActiveJobProgressJob[] = [
      {
        id: "job-2",
        job_number: "JOB-002",
        customer: null,
        status: "in_progress",
        due_date: "2026-06-02T00:00:00.000Z",
        due_date_override: null,
        parts: [{ operations: [] }],
      },
    ];

    expect(buildActiveJobProgressSummaries(jobs)).toEqual([
      expect.objectContaining({
        jobNumber: "JOB-002",
        totalOperations: 0,
        completedOperations: 0,
        completionPercentage: 0,
      }),
    ]);
  });

  it("excludes completed jobs and sorts by effective due date", () => {
    const jobs: ActiveJobProgressJob[] = [
      {
        id: "job-3",
        job_number: "JOB-003",
        customer: null,
        status: "completed",
        due_date: "2026-06-04T00:00:00.000Z",
        due_date_override: null,
        parts: [{ operations: [{ status: "completed" }] }],
      },
      {
        id: "job-1",
        job_number: "JOB-001",
        customer: null,
        status: "in_progress",
        due_date: "2026-06-05T00:00:00.000Z",
        due_date_override: null,
        parts: [{ operations: [{ status: "in_progress" }] }],
      },
      {
        id: "job-2",
        job_number: "JOB-002",
        customer: null,
        status: "in_progress",
        due_date: "2026-06-08T00:00:00.000Z",
        due_date_override: "2026-06-03T00:00:00.000Z",
        parts: [{ operations: [{ status: "completed" }] }],
      },
    ];

    expect(buildActiveJobProgressSummaries(jobs).map((job) => job.jobNumber)).toEqual([
      "JOB-002",
      "JOB-001",
    ]);
  });

  it("summarizes the active-job rollup metrics", () => {
    const summary = summarizeActiveJobProgress([
      {
        id: "job-1",
        jobNumber: "JOB-001",
        customer: null,
        status: "in_progress",
        dueDate: null,
        dueDateOverride: null,
        effectiveDueDate: null,
        totalOperations: 4,
        completedOperations: 1,
        completionPercentage: 25,
      },
      {
        id: "job-2",
        jobNumber: "JOB-002",
        customer: null,
        status: "not_started",
        dueDate: null,
        dueDateOverride: null,
        effectiveDueDate: null,
        totalOperations: 2,
        completedOperations: 2,
        completionPercentage: 100,
      },
    ]);

    expect(summary).toEqual({
      activeJobsCount: 2,
      averageCompletionPercentage: 63,
      jobsAtHundredPercent: 1,
    });
  });
});
