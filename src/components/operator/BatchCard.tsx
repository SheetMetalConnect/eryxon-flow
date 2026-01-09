import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Layers,
  Play,
  CheckCircle2,
  ChevronDown,
  Package,
  Clock,
  Percent,
  Zap,
  Cylinder,
  Scissors,
  Sparkles,
} from "lucide-react";
import { useStartBatch, useCompleteBatch } from "@/hooks/useBatches";
import type { BatchWithOperations, BatchType, BatchStatus } from "@/types/batches";
import { BATCH_STATUS_CONFIG, BATCH_TYPE_CONFIG } from "@/types/batches";
import BatchOperatorModal from "./BatchOperatorModal";

interface BatchCardProps {
  batch: BatchWithOperations;
  onUpdate?: () => void;
  compact?: boolean;
}

const BATCH_TYPE_ICONS: Record<BatchType, React.ElementType> = {
  laser_nesting: Zap,
  tube_batch: Cylinder,
  saw_batch: Scissors,
  finishing_batch: Sparkles,
  general: Layers,
};

export default function BatchCard({ batch, onUpdate, compact = false }: BatchCardProps) {
  const { t } = useTranslation();
  const [showOperations, setShowOperations] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const startBatch = useStartBatch();
  const completeBatch = useCompleteBatch();

  const statusConfig = BATCH_STATUS_CONFIG[batch.status];
  const TypeIcon = BATCH_TYPE_ICONS[batch.batch_type];
  const nestingMeta = batch.nesting_metadata as Record<string, any> | null;

  // Calculate completion progress
  const operations = batch.batch_operations || [];
  const completedOps = operations.filter((bo: any) => bo.operation?.status === "completed").length;
  const totalOps = operations.length;
  const progressPercent = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

  const statusColors: Record<BatchStatus, string> = {
    draft: "bg-muted",
    ready: "bg-blue-500",
    in_progress: "bg-status-active",
    completed: "bg-status-completed",
    cancelled: "bg-destructive",
  };

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await startBatch.mutateAsync(batch.id);
    onUpdate?.();
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await completeBatch.mutateAsync(batch.id);
    onUpdate?.();
  };

  if (compact) {
    return (
      <>
        <Card
          className={`p-3 cursor-pointer transition-all hover:shadow-md border-l-4 ${
            batch.status === "in_progress" ? "ring-2 ring-status-active border-l-status-active" : "border-l-brand-primary"
          }`}
          onClick={() => setShowModal(true)}
        >
          {/* Status Bar */}
          <div className={`h-1 -mx-3 -mt-3 mb-2 rounded-t ${statusColors[batch.status]}`} />

          {/* Compact Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <TypeIcon className="h-4 w-4 text-brand-primary shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{batch.batch_number}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {batch.material}
                  {batch.thickness_mm && ` • ${batch.thickness_mm}mm`}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {batch.operations_count}
            </Badge>
          </div>

          {/* Progress */}
          {batch.status === "in_progress" && (
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-1" />
              <div className="text-xs text-muted-foreground text-right">
                {completedOps}/{totalOps}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-1 mt-2">
            {(batch.status === "draft" || batch.status === "ready") && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStart}
                disabled={startBatch.isPending}
                className="flex-1 h-7 text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                {t("batches.startBatch")}
              </Button>
            )}
            {batch.status === "in_progress" && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completeBatch.isPending}
                className="flex-1 h-7 text-xs cta-button"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("batches.completeBatch")}
              </Button>
            )}
          </div>
        </Card>

        <BatchOperatorModal
          batch={batch}
          open={showModal}
          onClose={() => setShowModal(false)}
          onUpdate={onUpdate}
        />
      </>
    );
  }

  return (
    <>
      <Card
        className={`p-4 cursor-pointer transition-all hover:shadow-md border-l-4 ${
          batch.status === "in_progress" ? "ring-2 ring-status-active border-l-status-active" : "border-l-brand-primary"
        }`}
        onClick={() => setShowModal(true)}
      >
        {/* Status Bar */}
        <div className={`h-1.5 -mx-4 -mt-4 mb-3 rounded-t ${statusColors[batch.status]}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-brand-primary/10">
              <TypeIcon className="h-5 w-5 text-brand-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{batch.batch_number}</div>
              <div className="text-sm text-muted-foreground">
                {t(`batches.types.${batch.batch_type}`)}
              </div>
            </div>
          </div>
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
            {t(`batches.status.${batch.status}`)}
          </Badge>
        </div>

        {/* Material Info */}
        {(batch.material || batch.thickness_mm) && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{batch.material}</span>
            {batch.thickness_mm && (
              <Badge variant="outline" className="text-xs">
                {batch.thickness_mm}mm
              </Badge>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>{batch.operations_count} {t("batches.operationsCount").toLowerCase()}</span>
          </div>
          {nestingMeta?.efficiency_percent && (
            <div className="flex items-center gap-1 text-status-completed">
              <Percent className="h-4 w-4" />
              <span className="font-medium">{nestingMeta.efficiency_percent}%</span>
            </div>
          )}
          {batch.estimated_time && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{batch.estimated_time}min</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {batch.status === "in_progress" && totalOps > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t("common.progress")}</span>
              <span>{completedOps}/{totalOps} ({Math.round(progressPercent)}%)</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Operations Preview (Collapsible) */}
        {operations.length > 0 && (
          <Collapsible open={showOperations} onOpenChange={setShowOperations}>
            <CollapsibleTrigger
              className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{t("batches.operationsInBatch")}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showOperations ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent onClick={(e) => e.stopPropagation()}>
              <div className="space-y-1 pt-2 border-t max-h-40 overflow-y-auto">
                {operations.slice(0, 5).map((bo: any, idx) => (
                  <div
                    key={bo.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                      <span className="truncate">{bo.operation?.part?.part_number}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        bo.operation?.status === "completed"
                          ? "bg-status-completed/20 text-status-completed border-status-completed/30"
                          : bo.operation?.status === "in_progress"
                          ? "bg-status-active/20 text-status-active border-status-active/30"
                          : ""
                      }`}
                    >
                      {bo.operation?.status}
                    </Badge>
                  </div>
                ))}
                {operations.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{operations.length - 5} more
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {(batch.status === "draft" || batch.status === "ready") && (
            <Button
              variant="outline"
              onClick={handleStart}
              disabled={startBatch.isPending}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {t("batches.startBatch")}
            </Button>
          )}
          {batch.status === "in_progress" && (
            <Button
              onClick={handleComplete}
              disabled={completeBatch.isPending}
              className="flex-1 cta-button"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("batches.completeBatch")}
            </Button>
          )}
        </div>
      </Card>

      <BatchOperatorModal
        batch={batch}
        open={showModal}
        onClose={() => setShowModal(false)}
        onUpdate={onUpdate}
      />
    </>
  );
}
