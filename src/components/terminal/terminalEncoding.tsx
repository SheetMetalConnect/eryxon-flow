import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock3, Info, PauseCircle, PlayCircle, ShieldCheck, Zap } from "lucide-react";
import type { TFunction } from "i18next";
import type { TerminalJob } from "@/types/terminal";

type EncodingTone = {
  stripeClassName: string;
  chipClassName: string;
  labelKey: string;
  fallbackLabel: string;
  icon: typeof PlayCircle;
};

const statusToneByJobStatus: Record<TerminalJob["status"], EncodingTone> = {
  in_progress: {
    stripeClassName: "border-l-[hsl(var(--status-active))]",
    chipClassName: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    labelKey: "terminal.encoding.status.active",
    fallbackLabel: "Active",
    icon: PlayCircle,
  },
  in_buffer: {
    stripeClassName: "border-l-[hsl(var(--info))]",
    chipClassName: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    labelKey: "terminal.encoding.status.pending",
    fallbackLabel: "Pending",
    icon: Clock3,
  },
  expected: {
    stripeClassName: "border-l-[hsl(var(--status-pending))]",
    chipClassName: "border-border bg-muted/50 text-muted-foreground",
    labelKey: "terminal.encoding.status.expected",
    fallbackLabel: "Expected",
    icon: Clock3,
  },
  completed: {
    stripeClassName: "border-l-[hsl(var(--status-completed))]",
    chipClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    labelKey: "terminal.encoding.status.done",
    fallbackLabel: "Done",
    icon: ShieldCheck,
  },
  on_hold: {
    stripeClassName: "border-l-[hsl(var(--status-blocked))]",
    chipClassName: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    labelKey: "terminal.encoding.status.blocked",
    fallbackLabel: "Blocked",
    icon: PauseCircle,
  },
};

const operationTypeToneByKey: Record<string, string> = {
  scan: "border-primary/30 bg-primary/10 text-primary",
  cutting: "border-[hsl(var(--stage-cutting))]/30 bg-[hsl(var(--stage-cutting))]/10 text-[hsl(var(--stage-cutting))]",
  cut: "border-[hsl(var(--stage-cutting))]/30 bg-[hsl(var(--stage-cutting))]/10 text-[hsl(var(--stage-cutting))]",
  bending: "border-[hsl(var(--stage-bending))]/30 bg-[hsl(var(--stage-bending))]/10 text-[hsl(var(--stage-bending))]",
  bend: "border-[hsl(var(--stage-bending))]/30 bg-[hsl(var(--stage-bending))]/10 text-[hsl(var(--stage-bending))]",
  welding: "border-[hsl(var(--stage-welding))]/30 bg-[hsl(var(--stage-welding))]/10 text-[hsl(var(--stage-welding))]",
  weld: "border-[hsl(var(--stage-welding))]/30 bg-[hsl(var(--stage-welding))]/10 text-[hsl(var(--stage-welding))]",
  assembly: "border-[hsl(var(--stage-assembly))]/30 bg-[hsl(var(--stage-assembly))]/10 text-[hsl(var(--stage-assembly))]",
  finishing: "border-[hsl(var(--stage-finishing))]/30 bg-[hsl(var(--stage-finishing))]/10 text-[hsl(var(--stage-finishing))]",
  finish: "border-[hsl(var(--stage-finishing))]/30 bg-[hsl(var(--stage-finishing))]/10 text-[hsl(var(--stage-finishing))]",
  qc: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  inspection: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
};

const operationTypeLabelByKey: Record<string, { key: string; fallback: string }> = {
  scan: { key: "terminal.encoding.type.scan", fallback: "Scan" },
  cutting: { key: "terminal.encoding.type.cut", fallback: "Cut" },
  cut: { key: "terminal.encoding.type.cut", fallback: "Cut" },
  bending: { key: "terminal.encoding.type.bend", fallback: "Bend" },
  bend: { key: "terminal.encoding.type.bend", fallback: "Bend" },
  welding: { key: "terminal.encoding.type.weld", fallback: "Weld" },
  weld: { key: "terminal.encoding.type.weld", fallback: "Weld" },
  assembly: { key: "terminal.encoding.type.assembly", fallback: "Assembly" },
  finishing: { key: "terminal.encoding.type.finishing", fallback: "Finishing" },
  finish: { key: "terminal.encoding.type.finishing", fallback: "Finishing" },
  qc: { key: "terminal.encoding.type.qc", fallback: "QC" },
  inspection: { key: "terminal.encoding.type.qc", fallback: "QC" },
};

function classifyOperationText(value: string | null | undefined) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;

  if (text.includes("scan")) return "scan";
  if (text.includes("laser") || text.includes("cut") || text.includes("snij")) return "cutting";
  if (text.includes("bend") || text.includes("kant") || text.includes("zet")) return "bending";
  if (text.includes("weld") || text.includes("las")) return "welding";
  if (text.includes("finish") || text.includes("afwerk") || text.includes("nabewerk")) return "finishing";
  if (text.includes("inspect") || text.includes("qc") || text.includes("quality") || text.includes("controle")) return "inspection";
  if (text.includes("assembly") || text.includes("assembl") || text.includes("montage")) return "assembly";

  return null;
}

function normalizeOperationType(job: Pick<TerminalJob, "operationType" | "currentOp" | "batchContext" | "cellName">) {
  // The instruction card is explicitly a *cell* instruction card. Prefer the
  // selected cell's manufacturing stage when it is recognizable; otherwise an
  // Afwerking cell with a missing/unknown operation type falls through to the
  // old hard-coded "Assembly" default, which makes the warning look wrong.
  const cellType = classifyOperationText(job.cellName);
  if (cellType) return cellType;

  const direct = classifyOperationText(job.operationType);
  if (direct) return direct;

  const nameType = classifyOperationText(job.currentOp);
  if (nameType) return nameType;

  if (job.batchContext?.batchType?.includes("nest")) return "scan";
  return "operation";
}

export function getTerminalStatusTone(job: Pick<TerminalJob, "status" | "isCurrentUserClocked">) {
  if (job.status === "on_hold") {
    return statusToneByJobStatus.on_hold;
  }

  if (job.isCurrentUserClocked) {
    return statusToneByJobStatus.in_progress;
  }

  return statusToneByJobStatus[job.status];
}

export function getTerminalOperationType(job: Pick<TerminalJob, "operationType" | "currentOp" | "batchContext" | "cellName">) {
  const key = normalizeOperationType(job);
  return {
    key,
    chipClassName: operationTypeToneByKey[key] || "border-border bg-muted/50 text-muted-foreground",
    label: operationTypeLabelByKey[key] || { key: "terminal.encoding.type.operation", fallback: "Operation" },
  };
}

export function TerminalEncodingBadges({
  job,
  t,
  compact = false,
}: {
  job: TerminalJob;
  t: TFunction;
  compact?: boolean;
}) {
  const statusTone = getTerminalStatusTone(job);
  const StatusIcon = statusTone.icon;
  const bulletIsSubdued = job.status === "on_hold";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      <Badge
        variant="outline"
        className={cn(
          "min-h-6 rounded-full px-2 py-0 text-[10px] font-semibold uppercase tracking-wide",
          statusTone.chipClassName,
        )}
      >
        <StatusIcon className="mr-1 h-3 w-3" />
        {t(statusTone.labelKey, statusTone.fallbackLabel)}
      </Badge>
      {job.isBulletCard ? (
        <Badge
          variant="outline"
          className={cn(
            "min-h-6 rounded-full px-2 py-0 text-[10px] font-semibold uppercase tracking-wide",
            bulletIsSubdued
              ? "border-red-500/30 bg-transparent text-red-500"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          <Zap className="mr-1 h-3 w-3" />
          {t("terminal.encoding.priority.bullet", "Bullet")}
        </Badge>
      ) : null}
    </div>
  );
}

export function TerminalInstructionFallback({
  t,
  className,
}: {
  t: TFunction;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-10 items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="space-y-0.5">
        <div className="font-semibold">{t("terminal.instructions.missingTitle", "Instructions optional")}</div>
        <div className="text-muted-foreground">
          {t("terminal.instructions.missingBody", "No operator instructions for this cell — follow the routing steps.")}
        </div>
      </div>
    </div>
  );
}
