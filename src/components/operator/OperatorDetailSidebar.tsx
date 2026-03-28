import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DetailPanel } from "@/components/terminal/DetailPanel";
import { TerminalJob } from "@/types/terminal";
import type { PMIData, GeometryData } from "@/hooks/useCADProcessing";
import type { OperationWithDetails } from "@/lib/database";

interface OperatorDetailSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedJob: TerminalJob | null;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onComplete: () => Promise<void>;
  stepUrl: string | null;
  pdfUrl: string | null;
  pmiData: PMIData | null;
  serverGeometry: GeometryData | null;
  operations: OperationWithDetails[];
  onDataRefresh: () => void;
}

export function OperatorDetailSidebar({
  collapsed,
  onToggleCollapse,
  selectedJob,
  onStart,
  onPause,
  onComplete,
  stepUrl,
  pdfUrl,
  pmiData,
  serverGeometry,
  operations,
  onDataRefresh,
}: OperatorDetailSidebarProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Collapse toggle */}
      <div className="flex shrink-0 items-center justify-center border-b border-border py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-6 w-6 rounded-full border border-border bg-card p-0 shadow-sm hover:bg-accent"
        >
          {collapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </div>

      {collapsed ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4">
          <span className="rotate-180 text-[10px] text-muted-foreground [writing-mode:vertical-lr]">
            {t("terminal.detailsPanel", "Details Panel")}
          </span>
        </div>
      ) : selectedJob ? (
        <DetailPanel
          job={selectedJob}
          onStart={onStart}
          onPause={onPause}
          onComplete={onComplete}
          stepUrl={stepUrl}
          pdfUrl={pdfUrl}
          pmiData={pmiData}
          serverGeometry={serverGeometry}
          operations={operations}
          onDataRefresh={onDataRefresh}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <ChevronLeft className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mb-2 text-xl font-medium text-foreground">
            {t("terminal.noJobSelected", "No Job Selected")}
          </h3>
          <p className="text-sm">
            {t(
              "terminal.noJobSelectedDescription",
              "Select a job from the list to view details and controls.",
            )}
          </p>
        </div>
      )}
    </>
  );
}
