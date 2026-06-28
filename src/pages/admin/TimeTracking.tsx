import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { Clock, Users, Briefcase, ChevronDown, Loader2, AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import type { JobRollup, OperatorRollup } from "@/lib/admin/timeTracking";
import { formatDuration as formatMinutes } from "@/lib/time-utils";

type RangePreset = 7 | 30 | 90;

export default function TimeTracking() {
  const { t } = useTranslation();

  const [from, setFrom] = useState<Date>(() => startOfDay(subDays(new Date(), 6)));
  const [to, setTo] = useState<Date>(() => endOfDay(new Date()));

  const { rollup, isLoading, isError } = useTimeTracking(from, to);

  const applyPreset = (days: RangePreset) => {
    setFrom(startOfDay(subDays(new Date(), days - 1)));
    setTo(endOfDay(new Date()));
  };

  const onFromChange = (value: string) => {
    if (!value) return;
    setFrom(startOfDay(new Date(value)));
  };
  const onToChange = (value: string) => {
    if (!value) return;
    setTo(endOfDay(new Date(value)));
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("timeTracking.title")}
        description={t("timeTracking.description")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label={t("timeTracking.from")}
            value={format(from, "yyyy-MM-dd")}
            onChange={(e) => onFromChange(e.target.value)}
            className="h-9 w-auto"
          />
          <span className="text-muted-foreground text-sm">{t("timeTracking.to")}</span>
          <Input
            type="date"
            aria-label={t("timeTracking.to")}
            value={format(to, "yyyy-MM-dd")}
            onChange={(e) => onToChange(e.target.value)}
            className="h-9 w-auto"
          />
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>
              {t("timeTracking.last7")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>
              {t("timeTracking.last30")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(90)}>
              {t("timeTracking.last90")}
            </Button>
          </div>
        </div>
      </AdminPageHeader>

      <SummaryStrip rollup={rollup} t={t} />

      {isError ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("timeTracking.loadError")}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="operators" className="space-y-4">
          <TabsList>
            <TabsTrigger value="operators" className="gap-2">
              <Users className="h-4 w-4" />
              {t("timeTracking.tabs.operators")}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              {t("timeTracking.tabs.jobs")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operators">
            <OperatorTable rows={rollup.byOperator} t={t} />
          </TabsContent>

          <TabsContent value="jobs">
            <JobList rows={rollup.byJob} t={t} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

type TFn = ReturnType<typeof useTranslation>["t"];

function SummaryStrip({ rollup, t }: { rollup: ReturnType<typeof useTimeTracking>["rollup"]; t: TFn }) {
  const stats = [
    { label: t("timeTracking.summary.booked"), value: formatMinutes(rollup.totals.bookedMinutes), icon: Clock },
    { label: t("timeTracking.summary.entries"), value: String(rollup.totals.entryCount), icon: Clock },
    { label: t("timeTracking.summary.operators"), value: String(rollup.totals.operatorCount), icon: Users },
    { label: t("timeTracking.summary.jobs"), value: String(rollup.totals.jobCount), icon: Briefcase },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="glass-card">
          <CardContent className="flex items-center gap-3 py-4">
            <s.icon className="text-primary h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-muted-foreground truncate text-xs">{s.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
      {rollup.totals.activeCount > 0 && (
        <Card className="glass-card sm:col-span-4">
          <CardContent className="flex items-center gap-2 py-3 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-success relative inline-flex h-2.5 w-2.5 rounded-full" />
            </span>
            {t("timeTracking.summary.activeNow", { count: rollup.totals.activeCount })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OperatorTable({ rows, t }: { rows: OperatorRollup[]; t: TFn }) {
  if (rows.length === 0) {
    return <EmptyCard message={t("timeTracking.empty")} />;
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("timeTracking.tabs.operators")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("timeTracking.columns.operator")}</TableHead>
              <TableHead className="text-right">{t("timeTracking.columns.hoursWorked")}</TableHead>
              <TableHead className="text-right">{t("timeTracking.columns.entries")}</TableHead>
              <TableHead className="text-right">{t("timeTracking.columns.activeNow")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.operatorId}>
                <TableCell className="font-medium">
                  {row.operatorName ?? t("timeTracking.unknownOperator")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMinutes(row.bookedMinutes)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.entryCount}</TableCell>
                <TableCell className="text-right">
                  {row.activeCount > 0 ? (
                    <Badge variant="outline" className="border-success/40 text-success">
                      {row.activeCount}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function JobList({ rows, t }: { rows: JobRollup[]; t: TFn }) {
  if (rows.length === 0) {
    return <EmptyCard message={t("timeTracking.empty")} />;
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("timeTracking.tabs.jobs")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((job) => (
          <JobRow key={job.jobId || "__unassigned__"} job={job} t={t} />
        ))}
      </CardContent>
    </Card>
  );
}

function JobRow({ job, t }: { job: JobRollup; t: TFn }) {
  const [open, setOpen] = useState(false);
  const overPlanned = job.plannedMinutes > 0 && job.bookedMinutes > job.plannedMinutes;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <button className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors">
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {job.jobNumber ?? t("timeTracking.unassignedJob")}
            </div>
            {job.customer && (
              <div className="text-muted-foreground truncate text-xs">{job.customer}</div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm tabular-nums">
            <span className="font-medium">{formatMinutes(job.bookedMinutes)}</span>
            {job.plannedMinutes > 0 && (
              <span className="text-muted-foreground">
                / {formatMinutes(job.plannedMinutes)}
              </span>
            )}
            {overPlanned && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                {t("timeTracking.overPlanned")}
              </Badge>
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("timeTracking.columns.operation")}</TableHead>
                <TableHead className="text-right">{t("timeTracking.columns.booked")}</TableHead>
                <TableHead className="text-right">{t("timeTracking.columns.planned")}</TableHead>
                <TableHead className="text-right">{t("timeTracking.columns.variance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.operations.map((op) => (
                <TableRow
                  key={op.operationId}
                  className={cn(op.variance.isOverScheduled && "bg-destructive/5")}
                >
                  <TableCell className="font-medium">
                    {op.operationName ?? t("timeTracking.unknownOperation")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutes(op.variance.bookedMinutes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {op.variance.plannedMinutes > 0
                      ? formatMinutes(op.variance.plannedMinutes)
                      : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      op.variance.isOverScheduled ? "text-destructive font-medium" : "text-muted-foreground"
                    )}
                  >
                    {op.variance.plannedMinutes > 0
                      ? `${op.variance.varianceMinutes >= 0 ? "+" : ""}${formatMinutes(Math.abs(op.variance.varianceMinutes))}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-center text-sm">{message}</CardContent>
    </Card>
  );
}
