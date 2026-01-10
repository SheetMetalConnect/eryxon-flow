import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveOperators, LiveOperator } from "@/hooks/useLiveOperators";
import {
  Users,
  Activity,
  Clock,
  Coffee,
  CheckCircle2,
  XCircle,
  Wrench,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

function SummaryCard({
  title,
  value,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              variant === "success" && "bg-emerald-500/10",
              variant === "warning" && "bg-amber-500/10",
              variant === "danger" && "bg-red-500/10",
              variant === "default" && "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                variant === "success" && "text-emerald-500",
                variant === "warning" && "text-amber-500",
                variant === "danger" && "text-red-500",
                variant === "default" && "text-primary"
              )}
            />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OperatorCard({ operator }: { operator: LiveOperator }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        operator.status === "on_job" && "bg-emerald-500/5 border-emerald-500/30",
        operator.status === "idle" && "bg-amber-500/5 border-amber-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{operator.operatorName}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5",
                operator.status === "on_job" && "border-emerald-500/50 text-emerald-600",
                operator.status === "idle" && "border-amber-500/50 text-amber-600"
              )}
            >
              {operator.status === "on_job" ? t("liveOperators.onJob") : t("liveOperators.idle")}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            ID: {operator.employeeId} • {operator.todayStats.hoursWorked}h
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="font-mono font-semibold text-emerald-600">
            {operator.todayStats.goodParts}
          </div>
          <div className="text-muted-foreground">
            {t("liveOperators.goodParts")}
          </div>
        </div>
      </div>

      {operator.currentJob && (
        <div className="mt-2 pt-2 border-t border-border/50 text-xs">
          <div className="font-medium">{operator.currentJob.jobNumber}</div>
          <div className="text-muted-foreground truncate">
            {operator.currentJob.partNumber} → {operator.currentJob.operationName}
          </div>
          <div className="text-muted-foreground">
            Started {formatDistanceToNow(new Date(operator.currentJob.startTime), { addSuffix: true })}
          </div>
        </div>
      )}

      {operator.todayStats.scrapParts > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
          <XCircle className="h-3 w-3" />
          {operator.todayStats.scrapParts} {t("liveOperators.scrap")}
        </div>
      )}
    </div>
  );
}

function CellSection({
  cellName,
  cellColor,
  operators,
  partsProduced,
  goodParts,
}: {
  cellName: string;
  cellColor: string | null;
  operators: LiveOperator[];
  partsProduced: number;
  goodParts: number;
}) {
  const { t } = useTranslation();
  const qualityRate = partsProduced > 0 ? (goodParts / partsProduced) * 100 : 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cellColor || "#6b7280" }}
            />
            <CardTitle className="text-base">{cellName}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {operators.length}
            </Badge>
          </div>
          {partsProduced > 0 && (
            <div className="text-right">
              <div className="text-sm font-semibold">
                {goodParts} / {partsProduced}
              </div>
              <div className="text-xs text-muted-foreground">
                {qualityRate.toFixed(0)}% {t("liveOperators.quality")}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {operators.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            {t("liveOperators.noOperators")}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {operators.map((op) => (
              <OperatorCard key={op.id} operator={op} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LiveOperatorsDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useLiveOperators();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("liveOperators.title")}</h1>
          <p className="text-muted-foreground">{t("liveOperators.description")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <p className="text-destructive">{t("common.error", "Error loading data")}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const byCell = data?.byCell || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("liveOperators.title")}</h1>
          <p className="text-muted-foreground">
            {t("liveOperators.description")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("liveOperators.autoRefresh")}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard
          title={t("liveOperators.clockedIn")}
          value={summary?.totalClockedIn || 0}
          icon={Users}
        />
        <SummaryCard
          title={t("liveOperators.onJobs")}
          value={summary?.totalOnJob || 0}
          icon={Activity}
          variant="success"
        />
        <SummaryCard
          title={t("liveOperators.idleLabel")}
          value={summary?.totalIdle || 0}
          icon={Coffee}
          variant="warning"
        />
        <SummaryCard
          title={t("liveOperators.partsToday")}
          value={summary?.totalPartsToday || 0}
          icon={CheckCircle2}
        />
        <SummaryCard
          title={t("liveOperators.goodPartsLabel")}
          value={summary?.totalGoodParts || 0}
          icon={TrendingUp}
          variant="success"
        />
        <SummaryCard
          title={t("liveOperators.scrapLabel")}
          value={summary?.totalScrapParts || 0}
          icon={XCircle}
          variant="danger"
        />
        <SummaryCard
          title={t("liveOperators.qualityRate")}
          value={`${summary?.qualityRate || 100}%`}
          icon={Wrench}
          variant={
            (summary?.qualityRate || 100) >= 95
              ? "success"
              : (summary?.qualityRate || 100) >= 80
              ? "warning"
              : "danger"
          }
        />
      </div>

      {/* Quality Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t("liveOperators.overallQuality")}</span>
            <span className="text-sm font-bold">{summary?.qualityRate || 100}%</span>
          </div>
          <Progress
            value={summary?.qualityRate || 100}
            className={cn(
              "h-2",
              (summary?.qualityRate || 100) >= 95 && "[&>div]:bg-emerald-500",
              (summary?.qualityRate || 100) >= 80 &&
                (summary?.qualityRate || 100) < 95 &&
                "[&>div]:bg-amber-500",
              (summary?.qualityRate || 100) < 80 && "[&>div]:bg-red-500"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {summary?.totalGoodParts || 0} {t("liveOperators.good")}
            </span>
            <span>
              {summary?.totalScrapParts || 0} {t("liveOperators.scrap")} /{" "}
              {(data?.summary?.totalPartsToday || 0) - (summary?.totalGoodParts || 0) - (summary?.totalScrapParts || 0)} {t("liveOperators.rework")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* By Cell Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("liveOperators.byCell")}</h2>
        {byCell.map((cell) => (
          <CellSection
            key={cell.cellId}
            cellName={cell.cellName}
            cellColor={cell.cellColor}
            operators={cell.operators}
            partsProduced={cell.partsProduced}
            goodParts={cell.goodParts}
          />
        ))}
        {byCell.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t("liveOperators.noOneClockedIn")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
