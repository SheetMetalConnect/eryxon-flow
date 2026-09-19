import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Box, Boxes, FileText, Info, Layers3, MapPin, Maximize2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CncProgramQrCode } from "./CncProgramQrCode";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { OperationResources } from "./OperationResources";
import { AssemblyDependencies } from "./AssemblyDependencies";
import type { GeometryData, PMIData } from "@/hooks/useCADProcessing";
import type { OperationWithDetails } from "@/lib/db";
import type { TerminalJob } from "@/types/terminal";
import { cn } from "@/lib/utils";
import { useCellQRMMetrics } from "@/hooks/useQRMMetrics";
import { useProfile } from "@/hooks/useProfile";
import { OperationBatchTab } from "./OperationBatchTab";
import { OperationLocationTab } from "./OperationLocationTab";
import { OperationRoutePanel } from "./OperationRoutePanel";
import { TerminalActionBar } from "./TerminalActionBar";
import { TerminalFullscreenViewer } from "./TerminalFullscreenViewer";

interface DetailPanelProps {
  job: TerminalJob;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  startActionLabel?: string;
  pauseActionLabel?: string;
  showCompleteActionOverride?: boolean;
  isActionPending?: boolean;
  stepUrl?: string | null;
  pdfUrl?: string | null;
  pmiData?: PMIData | null;
  serverGeometry?: GeometryData | null;
  operations?: OperationWithDetails[];
  onDataRefresh?: () => void;
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
  isActionPending = false,
  stepUrl,
  pdfUrl,
  pmiData,
  serverGeometry,
  operations = [],
  onDataRefresh,
  locationTrackingEnabled = false,
}: DetailPanelProps) {
  const { t } = useTranslation();
  const profile = useProfile();
  const defaultTab: ViewerTab = job.hasModel ? "3d" : job.hasPdf ? "pdf" : "steps";
  const [activeTab, setActiveTab] = useState<ViewerTab>(defaultTab);
  const [fullscreenViewer, setFullscreenViewer] = useState<"3d" | "pdf" | null>(null);

  useEffect(() => setActiveTab(defaultTab), [defaultTab, job.id]);

  const nextOperation = useMemo(() => {
    const sorted = [...operations].sort((a, b) => a.sequence - b.sequence);
    const currentIndex = sorted.findIndex((operation) => operation.id === job.operationId);
    return currentIndex >= 0 ? sorted[currentIndex + 1] ?? null : null;
  }, [job.operationId, operations]);
  const { metrics: nextCellMetrics } = useCellQRMMetrics(
    nextOperation?.cell_id ?? null,
    profile?.tenant_id ?? null,
  );
  const capacityBlocked = Boolean(
    nextOperation &&
    nextCellMetrics?.enforce_limit &&
    nextCellMetrics.wip_limit !== null &&
    nextCellMetrics.current_wip >= nextCellMetrics.wip_limit,
  );
  const otherOperatorClocked = Boolean(job.activeTimeEntryId) && !job.isCurrentUserClocked;
  const completeDisabled = job.startBlocked || otherOperatorClocked || capacityBlocked;
  const completeTitle = job.startBlocked
    ? t("production.errors.notReleased")
    : otherOperatorClocked
      ? t("terminal.otherOperatorClocked")
      : capacityBlocked
        ? t("terminal.capacityBlocked")
        : t("terminal.completeOperation");
  const showCompleteAction = showCompleteActionOverride ?? true;

  const tabs = (
    [
      job.hasModel && { value: "3d", label: "3D", icon: Box },
      job.hasPdf && { value: "pdf", label: "PDF", icon: FileText },
      { value: "steps", label: t("terminal.tabs.steps"), icon: Layers3 },
      job.batchContext && { value: "batch", label: t("terminal.tabs.batch"), icon: Boxes },
      locationTrackingEnabled && { value: "location", label: t("terminal.tabs.location"), icon: MapPin },
      { value: "info", label: t("terminal.tabs.info"), icon: Info },
    ] as Array<{ value: ViewerTab; label: string; icon: typeof Box } | false | null>
  ).filter(Boolean) as Array<{ value: ViewerTab; label: string; icon: typeof Box }>;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card text-card-foreground">
      <div className={cn(
        "shrink-0 space-y-2 border-b border-l-4 border-border px-4 py-3",
        job.status === "on_hold" && "border-l-amber-500",
        job.isBulletCard && job.status !== "on_hold" && "border-l-destructive",
      )}>
        <div className="min-w-0">
          <h2 className="truncate font-mono text-base font-semibold">{job.jobCode}</h2>
          <p className="truncate text-sm text-muted-foreground">{job.description}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: job.cellColor || undefined }} />
          {job.cellName || t("terminal.columns.cell")}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ViewerTab)} className="flex h-full flex-col">
          <div className="shrink-0 px-4 pt-3">
            <TabsList className="grid h-auto w-full gap-1 rounded-lg bg-muted/30 p-0.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="min-h-9 rounded-md text-xs data-[state=active]:bg-background">
                  <tab.icon className="mr-1.5 h-3.5 w-3.5" />{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-4">
            {job.hasModel ? (
              <TabsContent value="3d" className="relative m-0 h-full overflow-hidden rounded-lg border bg-background">
                <STEPViewer url={stepUrl || ""} title={job.jobCode} pmiData={pmiData} serverGeometry={serverGeometry} preferServerGeometry />
                <Button variant="secondary" size="sm" onClick={() => setFullscreenViewer("3d")} className="absolute right-2 top-2 h-7 px-2 text-xs">
                  <Maximize2 className="mr-1 h-3 w-3" />{t("common.expand")}
                </Button>
              </TabsContent>
            ) : null}
            {job.hasPdf ? (
              <TabsContent value="pdf" className="relative m-0 h-full overflow-hidden rounded-lg border bg-background">
                <PDFViewer url={pdfUrl || ""} title={job.jobCode} />
                <Button variant="secondary" size="sm" onClick={() => setFullscreenViewer("pdf")} className="absolute right-2 top-2 h-7 px-2 text-xs">
                  <Maximize2 className="mr-1 h-3 w-3" />{t("common.expand")}
                </Button>
              </TabsContent>
            ) : null}
            <TabsContent value="steps" className="m-0 h-full overflow-auto">
              <OperationRoutePanel job={job} operations={operations} />
            </TabsContent>
            {job.batchContext ? (
              <TabsContent value="batch" className="m-0 h-full overflow-auto"><OperationBatchTab batch={job.batchContext} /></TabsContent>
            ) : null}
            {locationTrackingEnabled ? (
              <TabsContent value="location" className="m-0 h-full overflow-auto">
                {activeTab === "location" ? (
                  <OperationLocationTab
                    partId={job.partId}
                    operationId={job.operationId}
                    nextCellId={nextOperation?.cell_id ?? null}
                    nextCellName={nextOperation?.cell?.name ?? null}
                  />
                ) : null}
              </TabsContent>
            ) : null}
            <TabsContent value="info" className="m-0 h-full space-y-4 overflow-auto">
              <div className="grid gap-3 lg:grid-cols-2">
                <OperationResources operationId={job.operationId} />
                <AssemblyDependencies partId={job.partId} />
              </div>
              {job.cncProgramName ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                  <div className="rounded border bg-white p-1"><CncProgramQrCode programName={job.cncProgramName} size={48} /></div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("parts.cncProgramName")}</div>
                    <div className="truncate font-mono text-sm font-semibold">{job.cncProgramName}</div>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {job.warnings?.length ? (
        <div className="shrink-0 border-t bg-amber-500/10 px-4 py-2 text-xs text-amber-600">
          <div className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />{job.warnings.join(", ")}</div>
        </div>
      ) : null}
      <TerminalActionBar
        completeDisabled={completeDisabled}
        completeTitle={completeTitle}
        isActionPending={isActionPending}
        job={job}
        onComplete={onComplete}
        onDataRefresh={onDataRefresh}
        onPause={onPause}
        onStart={onStart}
        pauseActionLabel={pauseActionLabel}
        showCompleteAction={showCompleteAction}
        startActionLabel={startActionLabel}
      />
      <TerminalFullscreenViewer
        geometry={serverGeometry}
        jobCode={job.jobCode}
        mode={fullscreenViewer}
        onClose={() => setFullscreenViewer(null)}
        pdfUrl={pdfUrl}
        pmiData={pmiData}
        stepUrl={stepUrl}
      />
    </div>
  );
}
