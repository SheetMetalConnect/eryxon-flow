import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TerminalJob } from "@/types/terminal";
import { getDueUrgency, dueUrgencyTextClass } from "@/lib/due-date";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Square,
  FileText,
  Box,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Circle,
  Maximize2,
  X,
  ChevronDown,
  ChevronRight,
  PackageCheck,
  Zap,
  Layers3,
} from "lucide-react";
import { CncProgramQrCode } from "./CncProgramQrCode";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { OperationResources } from "./OperationResources";
import { AssemblyDependencies } from "./AssemblyDependencies";
import type { PMIData, GeometryData } from "@/hooks/useCADProcessing";
import { OperationWithDetails } from "@/lib/database";
import { cn } from "@/lib/utils";
import IssueForm from "@/components/operator/IssueForm";
import ProductionQuantityModal from "@/components/operator/ProductionQuantityModal";
import { JobFlowProgress } from "./JobFlowProgress";
import { useCellQRMMetrics } from "@/hooks/useQRMMetrics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { IconDisplay } from "@/components/ui/icon-picker";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";

interface Substep {
  id: string;
  operation_id: string;
  name: string;
  icon_name?: string | null;
  sequence: number;
  status: string;
  notes?: string;
}

interface DetailPanelProps {
  job: TerminalJob;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  stepUrl?: string | null;
  pdfUrl?: string | null;
  pmiData?: PMIData | null;
  serverGeometry?: GeometryData | null;
  operations?: OperationWithDetails[];
  onDataRefresh?: () => void;
}

type ViewerTab = "3d" | "pdf" | "ops";

export function DetailPanel({
  job,
  onStart,
  onPause,
  onComplete,
  stepUrl,
  pdfUrl,
  pmiData,
  serverGeometry,
  operations = [],
  onDataRefresh,
}: DetailPanelProps) {
  const { t } = useTranslation();
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [issuePrefilledData, setIssuePrefilledData] = useState<{
    affectedQuantity?: number;
    isShortfall?: boolean;
  } | null>(null);
  const [fullscreenViewer, setFullscreenViewer] = useState<"3d" | "pdf" | null>(
    null,
  );
  const [substepsByOperation, setSubstepsByOperation] = useState<
    Record<string, Substep[]>
  >({});
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(
    new Set(),
  );
  const { profile } = useAuth();
  const defaultTab: ViewerTab = job.hasModel ? "3d" : job.hasPdf ? "pdf" : "ops";

  useEffect(() => {
    const fetchSubsteps = async () => {
      if (!profile?.tenant_id || operations.length === 0) {
        setSubstepsByOperation({});
        return;
      }

      setSubstepsByOperation({});

      const operationIds = operations.map((operation) => operation.id);
      const { data, error } = await supabase
        .from("substeps")
        .select("*")
        .in("operation_id", operationIds)
        .eq("tenant_id", profile.tenant_id)
        .order("sequence", { ascending: true });

      if (error) {
        logger.error("DetailPanel", "Error fetching substeps", error);
        return;
      }

      const grouped: Record<string, Substep[]> = {};
      (data || []).forEach((substep) => {
        if (!grouped[substep.operation_id]) {
          grouped[substep.operation_id] = [];
        }
        grouped[substep.operation_id].push(substep);
      });

      return grouped;
    };

    let isActive = true;

    void fetchSubsteps().then((grouped) => {
      if (isActive && grouped) {
        setSubstepsByOperation(grouped);
      }
    });

    return () => {
      isActive = false;
    };
  }, [operations, profile?.tenant_id]);

  const toggleOperationExpand = (operationId: string) => {
    setExpandedOperations((prev) => {
      const next = new Set(prev);
      if (next.has(operationId)) {
        next.delete(operationId);
      } else {
        next.add(operationId);
      }
      return next;
    });
  };

  const nextOperation = useMemo(() => {
    if (!job.currentSequence) return null;
    const sorted = [...operations].sort((a, b) => a.sequence - b.sequence);
    const currentIndex = sorted.findIndex(
      (operation) => operation.id === job.operationId,
    );
    if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
    return sorted[currentIndex + 1];
  }, [operations, job.currentSequence, job.operationId]);

  const { metrics: nextCellMetrics } = useCellQRMMetrics(
    nextOperation?.cell_id || null,
    profile?.tenant_id || null,
  );

  const isBlockedByCapacity = useMemo(() => {
    if (!nextOperation || !nextCellMetrics) return false;
    if (!nextCellMetrics.enforce_limit || nextCellMetrics.wip_limit === null) {
      return false;
    }
    return nextCellMetrics.current_wip >= nextCellMetrics.wip_limit;
  }, [nextOperation, nextCellMetrics]);

  const statusBadge = useMemo(() => {
    if (job.isCurrentUserClocked) {
      return {
        label: t("terminal.inProcess"),
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    }

    switch (job.status) {
      case "in_progress":
        return {
          label: t("terminal.inProcess"),
          className:
            "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        };
      case "in_buffer":
        return {
          label: t("terminal.inBuffer"),
          className:
            "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        };
      case "on_hold":
        return {
          label: t("terminal.onHold", "On hold"),
          className:
            "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
        };
      default:
        return {
          label: t("terminal.expected"),
          className: "border-border bg-muted text-foreground",
        };
    }
  }, [job.isCurrentUserClocked, job.status, t]);

  const showCompleteAction =
    job.status === "in_progress" || job.isCurrentUserClocked;
  const completeDisabled =
    Boolean(job.activeTimeEntryId) || isBlockedByCapacity;
  const completeTitle = job.activeTimeEntryId
    ? t(
        "terminal.stopBeforeComplete",
        "Pause active timing before completing the operation.",
      )
    : isBlockedByCapacity
      ? t(
          "terminal.capacityBlocked",
          "Cannot complete because the next cell is at capacity.",
        )
      : t("terminal.completeOperation", "Complete operation");

  const renderOperations = () => {
    if (operations.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {t(
            "terminal.noOperationsFound",
            "No routing steps found for this part.",
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {operations.map((operation) => {
          const operationSubsteps = substepsByOperation[operation.id] || [];
          const hasSubsteps = operationSubsteps.length > 0;
          const isExpanded = expandedOperations.has(operation.id);
          const completedSubsteps = operationSubsteps.filter(
            (substep) => substep.status === "completed",
          ).length;

          return (
            <div
              key={operation.id}
              className={cn(
                "rounded-lg border border-border bg-background/80",
                operation.id === job.operationId &&
                  "border-primary/40 bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => hasSubsteps && toggleOperationExpand(operation.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left",
                  !hasSubsteps && "cursor-default",
                )}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {operation.sequence}.
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">
                      {operation.operation_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {operation.cell?.name || "?"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{operation.estimated_time}h est.</span>
                    {hasSubsteps ? (
                      <span>
                        {completedSubsteps}/{operationSubsteps.length}{" "}
                        {t("terminal.substeps", "substeps")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {operation.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : null}
                  {operation.status === "in_progress" ? (
                    <Clock3 className="h-3.5 w-3.5 text-primary" />
                  ) : null}
                  {operation.status === "not_started" ? (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                  ) : null}
                  {operation.status === "on_hold" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  ) : null}
                  {hasSubsteps ? (
                    isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )
                  ) : null}
                </div>
              </button>

              {hasSubsteps && isExpanded ? (
                <div className="border-t border-border px-3 py-2">
                  <div className="space-y-1">
                    {operationSubsteps.map((substep) => (
                      <div
                        key={substep.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        {substep.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                        ) : substep.status === "in_progress" ? (
                          <Clock3 className="h-3 w-3 shrink-0 text-primary" />
                        ) : substep.status === "blocked" ? (
                          <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                        ) : (
                          <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        )}
                        {substep.icon_name ? (
                          <IconDisplay
                            iconName={substep.icon_name}
                            className="h-3 w-3 shrink-0 text-muted-foreground"
                          />
                        ) : null}
                        <span
                          className={cn(
                            "truncate",
                            substep.status === "completed" && "line-through",
                          )}
                        >
                          {substep.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card text-card-foreground">
      {/* ── Compact header: job info + due date ── */}
      <div className="shrink-0 border-b border-border px-3 py-3">
        {job.isBulletCard ? (
          <div className="mb-2 flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
            <Zap className="h-3.5 w-3.5" />
            {t("terminal.bulletCard")}
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-base font-semibold text-foreground">
                {job.jobCode}
              </h2>
              <Badge
                variant="outline"
                className={cn("rounded-full text-[10px]", statusBadge.className)}
              >
                {statusBadge.label}
              </Badge>
            </div>
            <div className="text-sm font-medium text-foreground">
              {job.description}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{job.currentOp}</span>
              <span>•</span>
              <span>{job.cellName || "-"}</span>
              <span>•</span>
              <span>{job.material || "-"}</span>
              <span>•</span>
              <span>{job.quantity} pcs</span>
              {job.drawingNo ? (
                <>
                  <span>•</span>
                  <span>
                    {t("parts.drawingNo")}: {job.drawingNo}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {job.plannedStart ? (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("terminal.columns.plannedStart", "Start")}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {new Date(job.plannedStart).toLocaleDateString()}
                </div>
              </>
            ) : null}
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("terminal.columns.dueDate")}
            </div>
            <div
              className={cn(
                "text-sm font-semibold",
                dueUrgencyTextClass[getDueUrgency(job.dueDate)],
              )}
            >
              {new Date(job.dueDate).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {job.hours}h {t("operator.remaining", "remaining")}
            </div>
          </div>
        </div>

        {job.notes ? (
          <div className="mt-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
            {job.notes}
          </div>
        ) : null}
      </div>

      {/* ── Routing progress (compact) ── */}
      {job.jobId ? (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <JobFlowProgress
            jobId={job.jobId}
            currentCellId={job.cellId}
            nextCellName={nextOperation?.cell?.name}
            nextCellMetrics={nextCellMetrics}
          />
        </div>
      ) : null}

      {/* ── Resources + Dependencies (inline, compact) ── */}
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="grid gap-2 lg:grid-cols-2">
          <OperationResources operationId={job.operationId} />
          <AssemblyDependencies partId={job.partId} />
        </div>
      </div>

      {/* ── CNC Program QR (compact inline) ── */}
      {job.cncProgramName ? (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="rounded border border-border bg-white p-1">
              <CncProgramQrCode programName={job.cncProgramName} size={40} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("parts.cncProgramName")}
              </div>
              <div className="truncate font-mono text-sm font-semibold text-foreground">
                {job.cncProgramName}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 3D / PDF / Routing viewer — takes all remaining space ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs
          key={`${job.id}-${defaultTab}`}
          defaultValue={defaultTab}
          className="flex h-full flex-col"
        >
          <div className="shrink-0 border-b border-border px-3 py-2">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-muted/30 p-0.5">
              <TabsTrigger
                value="3d"
                disabled={!job.hasModel}
                className="min-h-8 rounded-md text-xs data-[state=active]:bg-background"
              >
                <Box className="mr-1.5 h-3.5 w-3.5" />
                3D
              </TabsTrigger>
              <TabsTrigger
                value="pdf"
                disabled={!job.hasPdf}
                className="min-h-8 rounded-md text-xs data-[state=active]:bg-background"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </TabsTrigger>
              <TabsTrigger
                value="ops"
                className="min-h-8 rounded-md text-xs data-[state=active]:bg-background"
              >
                <Layers3 className="mr-1.5 h-3.5 w-3.5" />
                {t("terminal.routing", "Routing")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-3">
            {job.hasModel ? (
              <TabsContent
                value="3d"
                className="relative m-0 h-full overflow-hidden rounded-lg border border-border bg-background"
              >
                <STEPViewer
                  url={stepUrl || ""}
                  title={job.jobCode}
                  pmiData={pmiData}
                  serverGeometry={serverGeometry}
                  preferServerGeometry={true}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFullscreenViewer("3d")}
                  className="absolute right-2 top-2 h-7 rounded-md bg-background/90 px-2 text-xs"
                >
                  <Maximize2 className="mr-1 h-3 w-3" />
                  {t("common.expand", "Expand")}
                </Button>
              </TabsContent>
            ) : null}

            {job.hasPdf ? (
              <TabsContent
                value="pdf"
                className="relative m-0 h-full overflow-hidden rounded-lg border border-border bg-background"
              >
                <PDFViewer url={pdfUrl || ""} title={job.jobCode} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFullscreenViewer("pdf")}
                  className="absolute right-2 top-2 h-7 rounded-md bg-background/90 px-2 text-xs"
                >
                  <Maximize2 className="mr-1 h-3 w-3" />
                  {t("common.expand", "Expand")}
                </Button>
              </TabsContent>
            ) : null}

            <TabsContent value="ops" className="m-0 h-full overflow-auto">
              {renderOperations()}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── Warnings ── */}
      {job.warnings?.length ? (
        <div className="shrink-0 border-t border-border bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {job.warnings.join(", ")}
          </div>
        </div>
      ) : null}

      {/* ── Action buttons — compact, sticky bottom ── */}
      <div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {!job.isCurrentUserClocked ? (
            <Button
              onClick={onStart}
              className="min-h-10 rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700"
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t("operations.start", "Start")}
            </Button>
          ) : (
            <Button
              onClick={onPause}
              variant="outline"
              className="min-h-10 rounded-lg text-sm"
            >
              <Pause className="mr-1.5 h-4 w-4" />
              {t("operations.pause", "Pause")}
            </Button>
          )}

          <Button
            onClick={() => setIsQuantityModalOpen(true)}
            variant="outline"
            className="min-h-10 rounded-lg border-primary/30 text-sm text-primary hover:bg-primary/10"
          >
            <PackageCheck className="mr-1.5 h-4 w-4" />
            {t("production.reportTitle", "Record output")}
          </Button>

          {showCompleteAction ? (
            <Button
              onClick={onComplete}
              variant="outline"
              className="min-h-10 rounded-lg text-sm"
              disabled={completeDisabled}
              title={completeTitle}
            >
              <Square className="mr-1.5 h-4 w-4" />
              {t("production.complete", "Complete")}
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => {
              setIssuePrefilledData(null);
              setIsIssueModalOpen(true);
            }}
            className="min-h-10 rounded-lg border-amber-500/30 text-sm text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
          >
            <AlertTriangle className="mr-1.5 h-4 w-4" />
            {t("issues.reportIssue", "Report issue")}
          </Button>
        </div>
      </div>

      {/* ── Modals ── */}
      <IssueForm
        operationId={job.operationId}
        open={isIssueModalOpen}
        onOpenChange={(open) => {
          setIsIssueModalOpen(open);
          if (!open) setIssuePrefilledData(null);
        }}
        onSuccess={() => {
          setIsIssueModalOpen(false);
          setIssuePrefilledData(null);
        }}
        prefilledData={issuePrefilledData}
      />

      <ProductionQuantityModal
        isOpen={isQuantityModalOpen}
        onClose={() => setIsQuantityModalOpen(false)}
        operationId={job.operationId}
        operationName={job.currentOp}
        partNumber={job.description}
        plannedQuantity={job.quantity}
        onSuccess={() => {
          setIsQuantityModalOpen(false);
          onDataRefresh?.();
        }}
        onFileIssue={(shortfallQuantity) => {
          setIssuePrefilledData({
            affectedQuantity: shortfallQuantity,
            isShortfall: true,
          });
          setIsIssueModalOpen(true);
        }}
      />

      {/* ── Fullscreen viewer portal ── */}
      {fullscreenViewer
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md"
              onClick={() => setFullscreenViewer(null)}
            >
              <div
                className="relative flex h-full flex-col overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-white">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60">
                      {job.jobCode}
                    </div>
                    <div className="text-sm font-semibold">
                      {fullscreenViewer === "3d" ? "3D" : "PDF"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFullscreenViewer(null)}
                    className="h-8 w-8 rounded-full p-0 text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden bg-background">
                  {fullscreenViewer === "3d" && stepUrl ? (
                    <STEPViewer
                      url={stepUrl}
                      title={job.jobCode}
                      pmiData={pmiData}
                      serverGeometry={serverGeometry}
                      preferServerGeometry={true}
                    />
                  ) : null}
                  {fullscreenViewer === "pdf" && pdfUrl ? (
                    <PDFViewer url={pdfUrl} title={job.jobCode} />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
