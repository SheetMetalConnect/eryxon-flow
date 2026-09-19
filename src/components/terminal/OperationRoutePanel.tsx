import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock3 } from "lucide-react";
import type { OperationWithDetails } from "@/lib/db";
import type { TerminalJob } from "@/types/terminal";
import { useOperationBookedHours } from "@/hooks/useOperationBookedHours";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time-utils";
import { IconDisplay } from "@/components/ui/icon-picker";
import { OperationTimeSummary } from "./OperationTimeSummary";
import { Progress } from "@/components/ui/progress";

interface Substep {
  id: string;
  operation_id: string;
  name: string;
  icon_name?: string | null;
  sequence: number;
  status: string;
  notes?: string;
}

interface OperationRoutePanelProps {
  job: TerminalJob;
  operations: OperationWithDetails[];
}

const StatusIcon = ({ status, large = false }: { status: string; large?: boolean }) => {
  const className = large ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5 shrink-0";
  if (status === "completed") return <CheckCircle2 className={`${className} text-emerald-500`} />;
  if (status === "in_progress") return <Clock3 className={`${className} text-primary`} />;
  if (status === "blocked" || status === "on_hold") return <AlertTriangle className={`${className} text-amber-500`} />;
  return <Circle className={`${className} text-muted-foreground/60`} />;
};

export function OperationRoutePanel({ job, operations }: OperationRoutePanelProps) {
  const { t } = useTranslation();
  const profile = useProfile();
  const [substeps, setSubsteps] = useState<Record<string, Substep[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const currentOperation = operations.find((operation) => operation.id === job.operationId);
  const bookedHours = useOperationBookedHours(job.operationId, currentOperation?.estimated_time ?? 0);

  useEffect(() => {
    let active = true;
    if (!profile?.tenant_id || operations.length === 0) {
      setSubsteps({});
      return;
    }
    const load = async () => {
      const { data, error } = await supabase.from("substeps").select("*")
        .in("operation_id", operations.map((operation) => operation.id))
        .eq("tenant_id", profile.tenant_id)
        .order("sequence", { ascending: true });
      if (error) {
        logger.error("DetailPanel", "Error fetching substeps", error);
        return;
      }
      const grouped: Record<string, Substep[]> = {};
      for (const substep of data ?? []) {
        (grouped[substep.operation_id] ??= []).push(substep);
      }
      if (active) setSubsteps(grouped);
    };
    void load();
    return () => { active = false; };
  }, [operations, profile?.tenant_id]);

  const currentSubsteps = substeps[job.operationId] ?? [];
  const instructionSteps = currentSubsteps.filter((substep) => Boolean(substep.notes?.trim()));
  const instruction = job.notes?.trim();
  const completedOperations = operations.filter((operation) => operation.status === "completed").length;
  const routeProgress = operations.length > 0
    ? Math.round((completedOperations / operations.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <OperationTimeSummary
        booked={bookedHours}
        t={t}
        producedQuantity={job.producedQuantity ?? 0}
        plannedQuantity={job.quantity}
      />

      {operations.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border bg-background/70 p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-foreground">{t("terminal.routeProgress")}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {completedOperations}/{operations.length}
            </span>
          </div>
          <Progress value={routeProgress} className="h-2 bg-muted [&>div]:bg-emerald-500 [&>div]:duration-300 motion-reduce:[&>div]:transition-none" />
        </div>
      ) : null}

      {instruction || instructionSteps.length ? (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("terminal.instructionLabel", "Instruction")}
          </div>
          {instruction ? <p className="whitespace-pre-wrap text-sm leading-6">{instruction}</p> : null}
          {instructionSteps.map((step) => (
            <p key={step.id} className="text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">{step.name}:</span> {step.notes}
            </p>
          ))}
        </div>
      ) : null}

      {job.isCurrentUserClocked && currentSubsteps.length ? (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("terminal.checklist", "Checklist")}
          </div>
          <div className="space-y-1.5 rounded-lg border border-border bg-background/60 p-3">
            {currentSubsteps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                <StatusIcon status={step.status} large />
                <span className={cn(step.status === "completed" && "text-muted-foreground line-through")}>{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("terminal.routing", "Routing")}
        </div>
        {operations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("terminal.noOperationsFound")}
          </div>
        ) : (
          <div className="space-y-1.5">
            {operations.map((operation) => {
              const steps = substeps[operation.id] ?? [];
              const isExpanded = expanded.has(operation.id);
              return (
                <div key={operation.id} className={cn("rounded-lg border bg-background/80 transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none", operation.id === job.operationId && "border-primary/40 bg-primary/5 shadow-sm")}>
                  <button
                    type="button"
                    onClick={() => steps.length && setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(operation.id)) next.delete(operation.id);
                      else next.add(operation.id);
                      return next;
                    })}
                    className={cn("flex w-full items-center justify-between gap-2 px-3 py-2 text-left", !steps.length && "cursor-default")}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{operation.sequence}.</span>
                        <span className="truncate text-xs font-semibold">{operation.operation_name}</span>
                        <span className="text-[10px] text-muted-foreground">{operation.cell?.name || "?"}</span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>{formatDuration(operation.estimated_time)} est.</span>
                        {steps.length ? <span>{steps.filter((step) => step.status === "completed").length}/{steps.length} {t("terminal.substeps")}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={operation.status} />
                      {steps.length ? isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" /> : null}
                    </div>
                  </button>
                  {steps.length && isExpanded ? (
                    <div className="animate-in space-y-1 border-t px-3 py-2 duration-150 fade-in slide-in-from-top-1 motion-reduce:animate-none">
                      {steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <StatusIcon status={step.status} />
                          {step.icon_name ? <IconDisplay iconName={step.icon_name} className="h-3 w-3" /> : null}
                          <span className={cn("truncate", step.status === "completed" && "line-through")}>{step.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
