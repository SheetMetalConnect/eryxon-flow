import { AlertTriangle, Layers3, ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BatchPromptState } from "@/hooks/useOperatorTerminal";

interface BatchFlowPromptProps {
  prompt: BatchPromptState;
  onSelectMode: (mode: "single" | "batch") => void;
}

export function BatchFlowPrompt({
  prompt,
  onSelectMode,
}: BatchFlowPromptProps) {
  const { t } = useTranslation();

  return (
    <div className="border-b border-border px-3 py-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("terminal.batchFlow.title", {
                  batchNumber: prompt.batchNumber,
                })}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {prompt.parentBatchNumber
                ? t("terminal.batchFlow.descriptionWithSheet", {
                    batchNumber: prompt.batchNumber,
                    sheetNumber: prompt.parentBatchNumber,
                  })
                : t("terminal.batchFlow.description", {
                    batchNumber: prompt.batchNumber,
                  })}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
            {prompt.batchType}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>{t("terminal.batchFlow.members", { count: prompt.totalMembers })}</span>
          <span>{t("terminal.batchFlow.ready", { count: prompt.readyMembers })}</span>
          {prompt.completedMembers > 0 ? (
            <span>{t("terminal.batchFlow.completed", { count: prompt.completedMembers })}</span>
          ) : null}
          {prompt.activeMembers > 0 ? (
            <span>{t("terminal.batchFlow.active", { count: prompt.activeMembers })}</span>
          ) : null}
        </div>

        {prompt.unavailableReason ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {t(`terminal.batchFlow.unavailable.${prompt.unavailableReason}`)}
            </span>
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button
            variant={prompt.mode === "single" ? "default" : "outline"}
            onClick={() => onSelectMode("single")}
            className="justify-start"
          >
            <ScanLine className="mr-2 h-4 w-4" />
            {t("terminal.batchFlow.singleAction")}
          </Button>
          <Button
            variant={prompt.mode === "batch" ? "default" : "outline"}
            onClick={() => onSelectMode("batch")}
            disabled={!prompt.isBatchActionAvailable && !prompt.isBatchTimerActive}
            className="justify-start"
          >
            <Layers3 className="mr-2 h-4 w-4" />
            {prompt.isBatchTimerActive
              ? t("terminal.batchFlow.batchRunning")
              : t("terminal.batchFlow.batchAction")}
          </Button>
        </div>
      </div>
    </div>
  );
}
