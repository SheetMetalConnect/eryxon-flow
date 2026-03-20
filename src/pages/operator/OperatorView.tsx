import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useCADProcessing,
  isCADServiceEnabled,
  type PMIData,
  type GeometryData,
} from "@/hooks/useCADProcessing";
import {
  fetchOperationsWithDetails,
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
  type OperationWithDetails,
} from "@/lib/database";
import { JobRow } from "@/components/terminal/JobRow";
import { DetailPanel } from "@/components/terminal/DetailPanel";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Clock3,
  Boxes,
  FileStack,
  Gauge,
  PackageSearch,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { TerminalJob } from "@/types/terminal";
import {
  OperatorEmptyState,
  OperatorPageHeader,
  OperatorPanel,
  OperatorStatCard,
  OperatorStatusChip,
} from "@/components/operator/OperatorStation";

interface Cell {
  id: string;
  name: string;
  color: string | null;
}

type QueueTab = "in_progress" | "in_buffer" | "expected";

export default function OperatorView() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>(
    () => localStorage.getItem("operator_selected_cell") || "all",
  );
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>("in_progress");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [pmiData, setPmiData] = useState<PMIData | null>(null);
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null);

  const { processCAD } = useCADProcessing();

  const loadData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      const [opsData, cellsData] = await Promise.all([
        fetchOperationsWithDetails(profile.tenant_id),
        supabase
          .from("cells")
          .select("id, name, color")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
      ]);

      setOperations(opsData);
      if (cellsData.data) setCells(cellsData.data);
    } catch (error) {
      logger.error("OperatorView", "Error loading data", error);
      toast.error(t("notifications.failedToLoadData"));
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, t]);

  useEffect(() => {
    void loadData();

    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel("operator-terminal-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void loadData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, profile?.tenant_id]);

  const handleCellChange = (value: string) => {
    setSelectedCellId(value);
    localStorage.setItem("operator_selected_cell", value);
    setSelectedJobId(null);
  };

  const mapOperationToJob = useCallback((op: OperationWithDetails): TerminalJob => {
    const hasPdf =
      op.part.file_paths?.some((path) => path.toLowerCase().endsWith(".pdf")) ||
      false;
    const hasModel =
      op.part.file_paths?.some((path) => {
        const lowerPath = path.toLowerCase();
        return lowerPath.endsWith(".step") || lowerPath.endsWith(".stp");
      }) || false;

    let status: TerminalJob["status"] = "expected";
    if (op.status === "in_progress") status = "in_progress";
    else if (op.status === "on_hold") status = "on_hold";
    else if (op.status === "not_started") status = "in_buffer";
    else if (op.status === "completed") status = "expected";

    if (op.active_time_entry) status = "in_progress";

    const estimated = op.estimated_time || 0;
    const actual = op.actual_time || 0;
    const remaining = Math.max(0, estimated - actual);

    return {
      id: op.id,
      operationId: op.id,
      partId: op.part.id,
      jobId: op.part.job.id,
      jobCode: op.part.job.job_number,
      description: op.part.part_number,
      material: op.part.material,
      quantity: op.part.quantity,
      currentOp: op.operation_name,
      totalOps: 0,
      hours: Number(remaining.toFixed(1)),
      dueDate: op.part.job.due_date || new Date().toISOString(),
      status,
      hasPdf,
      hasModel,
      filePaths: op.part.file_paths || [],
      activeTimeEntryId: op.active_time_entry?.id,
      activeOperatorId: op.active_time_entry?.operator_id,
      activeOperatorName: op.active_time_entry?.operator?.full_name,
      isCurrentUserClocked: op.active_time_entry?.operator_id === operatorId,
      notes: op.notes,
      cellName: op.cell.name,
      cellColor: op.cell.color || "#3b82f6",
      cellId: op.cell_id,
      currentSequence: op.sequence,
      drawingNo: op.part.drawing_no,
      cncProgramName: op.part.cnc_program_name,
      isBulletCard: op.part.is_bullet_card,
    };
  }, [operatorId]);

  const allJobs = useMemo(
    () => operations.map(mapOperationToJob),
    [mapOperationToJob, operations],
  );

  const filteredJobs = useMemo(() => {
    if (selectedCellId === "all") return allJobs;
    return allJobs.filter((job) => job.cellId === selectedCellId);
  }, [allJobs, selectedCellId]);

  const inProcessJobs = filteredJobs.filter((job) => job.status === "in_progress");

  const notStartedJobs = filteredJobs.filter(
    (job) => job.status === "in_buffer" || job.status === "expected",
  );
  const inBufferJobs = notStartedJobs
    .slice(0, 5)
    .map((job) => ({ ...job, status: "in_buffer" as const }));
  const expectedJobs = notStartedJobs
    .slice(5)
    .map((job) => ({ ...job, status: "expected" as const }));

  const queueGroups = useMemo<Record<QueueTab, TerminalJob[]>>(
    () => ({
      in_progress: inProcessJobs,
      in_buffer: inBufferJobs,
      expected: expectedJobs,
    }),
    [expectedJobs, inBufferJobs, inProcessJobs],
  );

  useEffect(() => {
    if (queueGroups[queueTab].length > 0) return;
    const nextTab =
      (Object.entries(queueGroups).find(([, jobs]) => jobs.length > 0)?.[0] as
        | QueueTab
        | undefined) || "in_progress";
    if (nextTab !== queueTab) setQueueTab(nextTab);
  }, [queueGroups, queueTab]);

  const selectedJob = allJobs.find((job) => job.id === selectedJobId) || null;

  const selectedPartOperations = useMemo(() => {
    if (!selectedJob) return [];
    return operations
      .filter((op) => op.part.id === selectedJob.partId)
      .sort((a, b) => a.sequence - b.sequence);
  }, [selectedJob, operations]);

  const selectedCellName =
    selectedCellId === "all"
      ? t("common.all", "All")
      : cells.find((cell) => cell.id === selectedCellId)?.name ||
        t("common.unknown", "Unknown");

  const docsCount = filteredJobs.filter((job) => job.hasPdf || job.hasModel).length;
  const activeCellCount = new Set(filteredJobs.map((job) => job.cellId)).size;

  useEffect(() => {
    const loadFiles = async () => {
      if (!selectedJob?.filePaths?.length) {
        setPdfUrl(null);
        setStepUrl(null);
        setPmiData(null);
        setGeometryData(null);
        return;
      }

      try {
        let pdf: string | null = null;
        let step: string | null = null;
        let signedStep: string | null = null;
        let stepFileName: string | null = null;

        for (const path of selectedJob.filePaths) {
          const lowerPath = path.toLowerCase();

          if (lowerPath.endsWith(".pdf") && !pdf) {
            const { data } = await supabase.storage
              .from("parts-cad")
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) pdf = data.signedUrl;
          } else if (
            (lowerPath.endsWith(".step") || lowerPath.endsWith(".stp")) &&
            !step
          ) {
            const { data } = await supabase.storage
              .from("parts-cad")
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              signedStep = data.signedUrl;
              stepFileName = path.split("/").pop() || "model.step";
              const response = await fetch(data.signedUrl);
              const blob = await response.blob();
              step = URL.createObjectURL(blob);
            }
          }
        }

        setPdfUrl(pdf);
        setStepUrl(step);

        if (signedStep && stepFileName && isCADServiceEnabled()) {
          try {
            const result = await processCAD(signedStep, stepFileName, {
              includeGeometry: true,
              includePMI: true,
              generateThumbnail: false,
            });
            if (result.success) {
              setPmiData(result.pmi ?? null);
              setGeometryData(result.geometry ?? null);
            } else {
              setPmiData(null);
              setGeometryData(null);
            }
          } catch (error) {
            logger.error("OperatorView", "Error during CAD processing", error);
            toast.error(t("production.cadProcessingFailed"));
            setPmiData(null);
            setGeometryData(null);
          }
        } else {
          setPmiData(null);
          setGeometryData(null);
        }
      } catch (error) {
        logger.error("OperatorView", "Error loading file URLs", error);
      }
    };

    void loadFiles();
  }, [selectedJob, processCAD, t]);

  const handleStart = async () => {
    if (!selectedJob || !operatorId || !profile?.tenant_id) return;
    try {
      await startTimeTracking(
        selectedJob.operationId,
        operatorId,
        profile.tenant_id,
      );
      toast.success(t("notifications.success"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("notifications.failed"),
      );
    }
  };

  const handlePause = async () => {
    if (!selectedJob || !operatorId) return;
    try {
      await stopTimeTracking(selectedJob.operationId, operatorId);
      toast.success(t("production.operationPaused"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("notifications.failed"),
      );
    }
  };

  const handleComplete = async () => {
    if (!selectedJob || !operatorId || !profile?.tenant_id) return;
    try {
      await completeOperation(
        selectedJob.operationId,
        profile.tenant_id,
        operatorId,
      );
      toast.success(t("production.operationCompleted"));
      setSelectedJobId(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("notifications.failed"),
      );
    }
  };

  const renderQueue = (
    jobs: TerminalJob[],
    variant: "process" | "buffer" | "expected",
    emptyTitle: string,
    emptyDescription: string,
  ) => {
    if (jobs.length === 0) {
      return (
        <OperatorEmptyState
          icon={PackageSearch}
          title={emptyTitle}
          description={emptyDescription}
          className="min-h-[260px]"
        />
      );
    }

    return (
      <div className="grid gap-3">
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            isSelected={selectedJobId === job.id}
            onClick={() => setSelectedJobId(job.id)}
            variant={variant}
          />
        ))}
      </div>
    );
  };

  if (loading && operations.length === 0) {
    return (
      <OperatorPanel className="flex min-h-[420px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="text-sm font-medium text-muted-foreground">
            {t("terminal.loading", "Loading operator workspace")}
            </div>
          </div>
        </OperatorPanel>
    );
  }

  return (
    <div className="space-y-4">
      <OperatorPageHeader
        eyebrow={t("navigation.terminalView", "Terminal View")}
        title={t("terminal.operatorStation", "Operator workspace")}
        description={t(
          "terminal.operatorStationDescription",
          "Focus the queue on the active cell, select one work packet, and keep the next operator action obvious.",
        )}
        meta={
          <>
            <OperatorStatusChip
              tone="info"
              label={`${selectedCellName} • ${filteredJobs.length} ${t(
                "terminal.jobsFound",
              )}`}
            />
            {selectedJob ? (
              <OperatorStatusChip
                tone="active"
                label={`${selectedJob.jobCode} • ${selectedJob.currentOp}`}
              />
            ) : null}
          </>
        }
        actions={
          <>
            <Select value={selectedCellId} onValueChange={handleCellChange}>
              <SelectTrigger className="min-h-11 w-[220px] rounded-xl border-border/80 bg-card">
                <SelectValue placeholder={t("terminal.selectCell", "Select cell")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("terminal.allCells", "All Cells")}</SelectItem>
                {cells.map((cell) => (
                  <SelectItem key={cell.id} value={cell.id}>
                    {cell.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => void loadData()}
              className="min-h-11 rounded-xl"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("common.refresh", "Refresh")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperatorStatCard
          label={t("terminal.inProcess")}
          value={inProcessJobs.length}
          caption={t("terminal.liveWork", "Operations currently in work")}
          icon={Clock3}
          tone="warning"
        />
        <OperatorStatCard
          label={t("terminal.inBuffer")}
          value={inBufferJobs.length}
          caption={t("terminal.readyNext", "Ready to start next")}
          icon={Boxes}
          tone="info"
        />
        <OperatorStatCard
          label={t("terminal.expected")}
          value={expectedJobs.length}
          caption={t("terminal.upcomingLoad", "Later queue in this view")}
          icon={Gauge}
        />
        <OperatorStatCard
          label={t("terminal.packet", "Work packets")}
          value={docsCount}
          caption={t(
            "terminal.packetCaption",
            `${activeCellCount} active cells with drawings or models`,
          )}
          icon={FileStack}
          tone="active"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <OperatorPanel className="overflow-hidden p-0">
          <Tabs
            value={queueTab}
            onValueChange={(value) => setQueueTab(value as QueueTab)}
            className="w-full"
          >
            <div className="border-b border-border px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {t("terminal.queueByStatus", "Queue by status")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t(
                      "terminal.queueByStatusDescription",
                      "Operators should see active work first, then what is ready next.",
                    )}
                  </div>
                </div>
                {loading ? (
                  <div className="text-sm text-muted-foreground">
                    {t("common.refreshing", "Refreshing")}
                  </div>
                ) : null}
              </div>
              <TabsList className="mt-4 grid h-auto w-full grid-cols-3 gap-2 rounded-2xl bg-muted/30 p-1">
                <TabsTrigger
                  value="in_progress"
                  className="min-h-16 rounded-xl data-[state=active]:bg-background"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">
                      {t("terminal.inProcess")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {inProcessJobs.length} {t("terminal.jobsFound")}
                    </span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="in_buffer"
                  className="min-h-16 rounded-xl data-[state=active]:bg-background"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">{t("terminal.inBuffer")}</span>
                    <span className="text-xs text-muted-foreground">
                      {inBufferJobs.length} {t("terminal.jobsFound")}
                    </span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="expected"
                  className="min-h-16 rounded-xl data-[state=active]:bg-background"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">{t("terminal.expected")}</span>
                    <span className="text-xs text-muted-foreground">
                      {expectedJobs.length} {t("terminal.jobsFound")}
                    </span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              <TabsContent value="in_progress" className="m-0">
                {renderQueue(
                  inProcessJobs,
                  "process",
                  t("terminal.noActiveJobs"),
                  t(
                    "terminal.noActiveJobsDescription",
                    "Nothing is currently clocked in for this cell selection.",
                  ),
                )}
              </TabsContent>
              <TabsContent value="in_buffer" className="m-0">
                {renderQueue(
                  inBufferJobs,
                  "buffer",
                  t("terminal.noBufferJobs", "No jobs ready next"),
                  t(
                    "terminal.noBufferJobsDescription",
                    "The immediate buffer is clear. Expected work will appear here as routing advances.",
                  ),
                )}
              </TabsContent>
              <TabsContent value="expected" className="m-0">
                {renderQueue(
                  expectedJobs,
                  "expected",
                  t("terminal.noExpectedJobs", "No upcoming jobs"),
                  t(
                    "terminal.noExpectedJobsDescription",
                    "There is no later queue for this cell selection right now.",
                  ),
                )}
              </TabsContent>
            </div>
          </Tabs>
        </OperatorPanel>

        <OperatorPanel className="overflow-hidden p-0">
          {selectedJob ? (
            <DetailPanel
              job={selectedJob}
              onStart={handleStart}
              onPause={handlePause}
              onComplete={handleComplete}
              stepUrl={stepUrl}
              pdfUrl={pdfUrl}
              pmiData={pmiData}
              serverGeometry={geometryData}
              operations={selectedPartOperations}
              onDataRefresh={() => void loadData()}
            />
          ) : (
            <OperatorEmptyState
              icon={Gauge}
              title={t("terminal.noJobSelected", "Select a work packet")}
              description={t(
                "terminal.noJobSelectedDescription",
                "Choose a job from the queue to show drawings, routing, production actions, and issue reporting in one place.",
              )}
              className="min-h-[720px] rounded-none border-0"
            />
          )}
        </OperatorPanel>
      </div>
    </div>
  );
}
