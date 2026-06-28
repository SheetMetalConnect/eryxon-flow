import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TerminalJob } from "@/types/terminal";
// getDueUrgency/dueUrgencyTextClass available if needed for future due-date display
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  Info,
  Maximize2,
  X,
  ChevronDown,
  ChevronRight,
  PackageCheck,
  Layers3,
  Boxes,
  MapPin,
} from "lucide-react";
import { CncProgramQrCode } from "./CncProgramQrCode";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { OperationResources } from "./OperationResources";
import { AssemblyDependencies } from "./AssemblyDependencies";
import type { PMIData, GeometryData } from "@/hooks/useCADProcessing";
import { OperationWithDetails } from "@/lib/database";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time-utils";
import IssueForm from "@/components/operator/IssueForm";
import ProductionQuantityModal from "@/components/operator/ProductionQuantityModal";
import { useCellQRMMetrics } from "@/hooks/useQRMMetrics";
import { useOperationBookedHours } from "@/hooks/useOperationBookedHours";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { IconDisplay } from "@/components/ui/icon-picker";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import {
  TerminalEncodingBadges,
  TerminalInstructionFallback,
} from "./terminalEncoding";
import { OperationBatchTab } from "./OperationBatchTab";
import { OperationLocationTab } from "./OperationLocationTab";
import { OperationTimeSummary } from "./OperationTimeSummary";

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
  startActionLabel?: string;
  pauseActionLabel?: string;
  showCompleteActionOverride?: boolean;
  stepUrl?: string | null;
  pdfUrl?: string | null;
  pmiData?: PMIData | null;
  serverGeometry?: GeometryData | null;
  operations?: OperationWithDetails[];
  onDataRefresh?: () => void;
  /** When true, surface the Location tab (drop-off placement) in the panel. */
  locationTrackingEnabled?: boolean;
}

type ViewerTab = "3d" | "pdf" | "steps" | "batch" | "location" | "info";

export function DetailPanel({
  job,
  onStart,
  onPause,
  onComplete,
  startActionLabel,
  pauseActionLabel,
  showCompleteActionOverride,
  stepUrl,
  pdfUrl,
  pmiData,
  serverGeometry,
  operations = [],
  onDataRefresh,
  locationTrackingEnabled = false,
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
  const profile = useProfile();
  const defaultTab: ViewerTab = job.hasModel ? "3d" : job.hasPdf ? "pdf" : "steps";
  const [activeTab, setActiveTab] = useState<ViewerTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, job.id]);

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

  const currentOperation = useMemo(
    () => operations.find((op) => op.id === job.operationId) ?? null,
    [operations, job.operationId],
  );
  const bookedHours = useOperationBookedHours(
    job.operationId,
    currentOperation?.estimated_time ?? 0,
  );

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

  const showCompleteAction =
    showCompleteActionOverride ??
    (job.status === "in_progress" || job.isCurrentUserClocked);
  // Completing while clocked on is fine — handleComplete stops the operator's
  // own timer first. Only block when *another* operator is still clocked on, or
  // the next cell is at capacity.
  const otherOperatorClocked =
    Boolean(job.activeTimeEntryId) && !job.isCurrentUserClocked;
  const completeDisabled = otherOperatorClocked || isBlockedByCapacity;
  const completeTitle = otherOperatorClocked
    ? t(
        "terminal.otherOperatorClocked",
        "Another operator is still clocked on this operation.",
      )
    : isBlockedByCapacity
      ? t(
          "terminal.capacityBlocked",
          "Cannot complete because the next cell is at capacity.",
        )
      : t("terminal.completeOperation", "Complete operation");

  const currentOperationSubsteps = substepsByOperation[job.operationId] || [];
  const currentOperationInstructionSteps = currentOperationSubsteps.filter((substep) =>
    Boolean(substep.notes?.trim()),
  );
  const instructionPreview = job.notes?.trim() || null;
  const hasInstructions =
    Boolean(instructionPreview) || currentOperationInstructionSteps.length > 0;

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
                      {String(operation.operation_name ?? "")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {String(operation.cell?.name || "?")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatDuration(operation.estimated_time)} est.</span>
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

  const nextCellName = nextOperation?.cell?.name ?? null;
  const nextCellId = nextOperation?.cell_id ?? null;
  const tabs = (
    [
      job.hasModel && { value: "3d", label: "3D", icon: Box },
      job.hasPdf && { value: "pdf", label: "PDF", icon: FileText },
      { value: "steps", label: t("terminal.tabs.steps", "Steps"), icon: Layers3 },
      job.batchContext && {
        value: "batch",
        label: t("terminal.tabs.batch", "Batch"),
        icon: Boxes,
      },
      locationTrackingEnabled && {
        value: "location",
        label: t("terminal.tabs.location", "Location"),
        icon: MapPin,
      },
      { value: "info", label: t("terminal.tabs.info", "Info"), icon: Info },
    ] as Array<{ value: ViewerTab; label: string; icon: typeof Box } | false>
  ).filter(Boolean) as Array<{ value: ViewerTab; label: string; icon: typeof Box }>;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card text-card-foreground">
      {/* ── Identity strip: one calm row, status/type/rush via the shared badges only ── */}
      <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-mono text-base font-semibold text-foreground">
            {String(job.jobCode ?? "")}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {String(job.description ?? "")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full border border-white/20"
              style={{ backgroundColor: job.cellColor || undefined }}
            />
            {job.cellName || t("terminal.columns.cell")}
          </span>
          <TerminalEncodingBadges job={job} t={t} />
        </div>
      </div>

      {/* ── Everything reference lives behind tabs and fills the screen ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs
          key={`${job.id}-${defaultTab}`}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ViewerTab)}
          className="flex h-full flex-col"
        >
          <div className="shrink-0 px-4 pt-3">
            <TabsList
              className="grid h-auto w-full gap-1 rounded-lg bg-muted/30 p-0.5"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="min-h-9 rounded-md text-xs data-[state=active]:bg-background"
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-4">
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

            {/* Steps: instructions for this cell, then the full routing ── flat, no nested boxes */}
            <TabsContent value="steps" className="m-0 h-full space-y-5 overflow-auto">
              {/* Time booked vs budget + who worked on this operation */}
              <OperationTimeSummary booked={bookedHours} t={t} />

              {/* Instruction — the operation's note, clearly labelled so its source is obvious */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("terminal.instructionLabel", "Instruction")}
                </div>
                {hasInstructions ? (
                  <>
                    {instructionPreview ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {instructionPreview}
                      </p>
                    ) : null}
                    {currentOperationInstructionSteps.map((substep) => (
                      <p key={substep.id} className="text-sm leading-6 text-muted-foreground">
                        <span className="font-medium text-foreground">{substep.name}:</span>{" "}
                        {substep.notes}
                      </p>
                    ))}
                  </>
                ) : (
                  <TerminalInstructionFallback t={t} />
                )}
              </div>

              {/* Step-by-step checklist — surfaced while the operator is clocked on */}
              {job.isCurrentUserClocked && currentOperationSubsteps.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("terminal.checklist", "Checklist")}
                  </div>
                  <div className="space-y-1.5 rounded-lg border border-border bg-background/60 p-3">
                    {currentOperationSubsteps.map((substep) => (
                      <div key={substep.id} className="flex items-center gap-2 text-sm">
                        {substep.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : substep.status === "in_progress" ? (
                          <Clock3 className="h-4 w-4 shrink-0 text-primary" />
                        ) : substep.status === "blocked" ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                        )}
                        <span
                          className={cn(
                            "text-foreground",
                            substep.status === "completed" && "text-muted-foreground line-through",
                          )}
                        >
                          {substep.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("terminal.routing", "Routing")}
                </div>
                {renderOperations()}
              </div>
            </TabsContent>

            {job.batchContext ? (
              <TabsContent value="batch" className="m-0 h-full overflow-auto">
                <OperationBatchTab batch={job.batchContext} />
              </TabsContent>
            ) : null}

            {locationTrackingEnabled ? (
              <TabsContent value="location" className="m-0 h-full overflow-auto">
                {activeTab === "location" ? (
                  <OperationLocationTab
                    partId={job.partId}
                    operationId={job.operationId}
                    nextCellId={nextCellId}
                    nextCellName={nextCellName}
                  />
                ) : null}
              </TabsContent>
            ) : null}

            {/* Info: resources + dependencies + CNC, the operator reference desk */}
            <TabsContent value="info" className="m-0 h-full space-y-4 overflow-auto">
              <div className="grid gap-3 lg:grid-cols-2">
                <OperationResources operationId={job.operationId} />
                <AssemblyDependencies partId={job.partId} />
              </div>

              {job.cncProgramName ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="rounded border border-border bg-white p-1">
                    <CncProgramQrCode programName={job.cncProgramName} size={48} />
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
              ) : null}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── Warnings ── */}
      {job.warnings?.length ? (
        <div className="shrink-0 border-t border-border bg-amber-500/10 px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
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
              {startActionLabel ?? t("operations.start", "Start")}
            </Button>
          ) : (
            <Button
              onClick={onPause}
              variant="outline"
              className="min-h-10 rounded-lg text-sm"
            >
              <Pause className="mr-1.5 h-4 w-4" />
              {pauseActionLabel ?? t("operations.pause", "Pause")}
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
              {job.isCurrentUserClocked
                ? t("terminal.stopAndComplete", "Stop & complete")
                : t("production.complete", "Complete")}
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
