export interface ActiveJobProgressOperation {
  status: string | null;
}

export interface ActiveJobProgressPart {
  operations?: ActiveJobProgressOperation[] | null;
}

export interface ActiveJobProgressJob {
  id: string;
  job_number: string;
  customer: string | null;
  status: string | null;
  due_date: string | null;
  due_date_override: string | null;
  parts?: ActiveJobProgressPart[] | null;
}

export interface ActiveJobProgressSummary {
  id: string;
  jobNumber: string;
  customer: string | null;
  status: string | null;
  dueDate: string | null;
  dueDateOverride: string | null;
  effectiveDueDate: string | null;
  totalOperations: number;
  completedOperations: number;
  completionPercentage: number;
}

export interface ActiveJobProgressRollup {
  activeJobsCount: number;
  averageCompletionPercentage: number;
  jobsAtHundredPercent: number;
}

function getEffectiveDueDate(job: ActiveJobProgressJob): string | null {
  return job.due_date_override ?? job.due_date ?? null;
}

function compareDueDates(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  return new Date(a).getTime() - new Date(b).getTime();
}

export function buildActiveJobProgressSummaries(
  jobs: ActiveJobProgressJob[],
): ActiveJobProgressSummary[] {
  return jobs
    .filter(
      (job) => job.status === "not_started" || job.status === "in_progress",
    )
    .map((job) => {
      const operations =
        job.parts?.flatMap((part) => part.operations ?? []) ?? [];
      const totalOperations = operations.length;
      const completedOperations = operations.filter(
        (operation) => operation.status === "completed",
      ).length;

      return {
        id: job.id,
        jobNumber: job.job_number,
        customer: job.customer,
        status: job.status,
        dueDate: job.due_date,
        dueDateOverride: job.due_date_override,
        effectiveDueDate: getEffectiveDueDate(job),
        totalOperations,
        completedOperations,
        completionPercentage:
          totalOperations > 0
            ? Math.round((completedOperations / totalOperations) * 100)
            : 0,
      };
    })
    .sort((a, b) => {
      const byDueDate = compareDueDates(
        a.effectiveDueDate,
        b.effectiveDueDate,
      );
      if (byDueDate !== 0) return byDueDate;
      return a.jobNumber.localeCompare(b.jobNumber);
    });
}

export function summarizeActiveJobProgress(
  jobs: ActiveJobProgressSummary[],
): ActiveJobProgressRollup {
  const activeJobsCount = jobs.length;
  const totalCompletion = jobs.reduce(
    (sum, job) => sum + job.completionPercentage,
    0,
  );

  return {
    activeJobsCount,
    averageCompletionPercentage:
      activeJobsCount > 0 ? Math.round(totalCompletion / activeJobsCount) : 0,
    jobsAtHundredPercent: jobs.filter(
      (job) => job.completionPercentage === 100,
    ).length,
  };
}
