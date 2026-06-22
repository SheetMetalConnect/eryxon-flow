import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  summarizeActiveJobProgress,
  type ActiveJobProgressSummary,
} from "@/lib/admin/activeJobProgress";

interface ActiveJobProgressCardProps {
  jobs: ActiveJobProgressSummary[];
  /** True tenant-wide count of active jobs; `jobs` is capped to the most urgent. */
  totalCount?: number;
}

export function ActiveJobProgressCard({
  jobs,
  totalCount,
}: ActiveJobProgressCardProps) {
  const { t } = useTranslation();
  const rollup = summarizeActiveJobProgress(jobs);
  const activeCount = totalCount ?? rollup.activeJobsCount;
  const isCapped = totalCount != null && totalCount > jobs.length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl">
          {t("dashboard.activeJobProgress")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 pb-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.activeJobsCount")}
            </p>
            <p className="text-3xl font-bold">
              {activeCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.averageCompletion")}
            </p>
            <p className="text-3xl font-bold">
              {rollup.averageCompletionPercentage}%
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.jobsAtHundredPercent")}
            </p>
            <p className="text-3xl font-bold">
              {rollup.jobsAtHundredPercent}
            </p>
          </div>
        </div>

        {isCapped && (
          <p className="pb-4 text-xs text-muted-foreground">
            {t("dashboard.activeJobProgressCapped", { shown: jobs.length })}
          </p>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="informational-text max-w-md mx-auto">
              {t("dashboard.noActiveJobProgress")}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t("dashboard.job")}</TableHead>
                  <TableHead>{t("dashboard.status")}</TableHead>
                  <TableHead>{t("dashboard.operations")}</TableHead>
                  <TableHead>{t("dashboard.completion")}</TableHead>
                  <TableHead>{t("dashboard.dueDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell>
                      <div className="font-medium">{job.jobNumber}</div>
                      {job.customer && (
                        <div className="text-xs text-muted-foreground">
                          {job.customer}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {job.status
                          ? t(
                              `operations.status.${job.status}`,
                              job.status.replace("_", " "),
                            )
                          : t("common.unknown", "Unknown")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.completedOperations}/{job.totalOperations}
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            {t("dashboard.completedOperations")}
                          </span>
                          <span className="font-medium">
                            {job.completionPercentage}%
                          </span>
                        </div>
                        <Progress value={job.completionPercentage} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.effectiveDueDate
                        ? format(new Date(job.effectiveDueDate), "MMM dd, yyyy")
                        : t("dashboard.noDueDate")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
