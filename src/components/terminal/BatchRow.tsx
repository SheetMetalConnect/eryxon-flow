import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Zap,
  Cylinder,
  Scissors,
  Sparkles,
  Layers,
} from "lucide-react";
import { useStartBatch, useCompleteBatch } from "@/hooks/useBatches";
import type { BatchWithOperations, BatchType } from "@/types/batches";
import { cn } from "@/lib/utils";
import BatchOperatorModal from "@/components/operator/BatchOperatorModal";

interface BatchRowProps {
  batch: BatchWithOperations;
  onUpdate?: () => void;
  variant?: "process" | "buffer" | "ready";
}

const BATCH_TYPE_ICONS: Record<BatchType, React.ElementType> = {
  laser_nesting: Zap,
  tube_batch: Cylinder,
  saw_batch: Scissors,
  finishing_batch: Sparkles,
  general: Layers,
};

export default function BatchRow({ batch, onUpdate, variant = "buffer" }: BatchRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const startBatch = useStartBatch();
  const completeBatch = useCompleteBatch();

  const TypeIcon = BATCH_TYPE_ICONS[batch.batch_type];
  const operations = batch.batch_operations || [];
  const completedOps = operations.filter((bo: any) => bo.operation?.status === "completed").length;
  const totalOps = operations.length;
  const progressPercent = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

  const variantStyles = {
    process: "bg-status-active/5 hover:bg-status-active/10 border-l-2 border-l-status-active",
    buffer: "bg-info/5 hover:bg-info/10 border-l-2 border-l-info",
    ready: "bg-muted/30 hover:bg-muted/50 border-l-2 border-l-brand-primary",
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

  return (
    <>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <tr
            className={cn(
              "cursor-pointer transition-colors group",
              variantStyles[variant],
              batch.status === "in_progress" && "ring-1 ring-inset ring-status-active/50"
            )}
          >
            {/* Expand Icon */}
            <td className="px-2 py-2 w-8">
              <div className="flex items-center justify-center">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </td>

            {/* Batch Icon + Number */}
            <td className="px-2 py-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-brand-primary/10">
                  <TypeIcon className="h-4 w-4 text-brand-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{batch.batch_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`batches.types.${batch.batch_type}`)}
                  </div>
                </div>
              </div>
            </td>

            {/* Material */}
            <td className="px-2 py-2">
              <div className="text-sm">
                {batch.material || "-"}
                {batch.thickness_mm && (
                  <span className="text-muted-foreground ml-1">
                    ({batch.thickness_mm}mm)
                  </span>
                )}
              </div>
            </td>

            {/* Operations Count */}
            <td className="px-2 py-2 text-center">
              <Badge variant="secondary" className="font-mono">
                {batch.operations_count} ops
              </Badge>
            </td>

            {/* Progress (for in_progress) or Status */}
            <td className="px-2 py-2 min-w-[120px]">
              {batch.status === "in_progress" ? (
                <div className="space-y-1">
                  <Progress value={progressPercent} className="h-1.5" />
                  <div className="text-xs text-muted-foreground text-center">
                    {completedOps}/{totalOps}
                  </div>
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    batch.status === "ready" && "bg-blue-500/20 text-blue-500 border-blue-500/30",
                    batch.status === "draft" && "bg-muted text-muted-foreground"
                  )}
                >
                  {t(`batches.status.${batch.status}`)}
                </Badge>
              )}
            </td>

            {/* Time Estimate */}
            <td className="px-2 py-2 text-right text-sm text-muted-foreground">
              {batch.estimated_time ? `${batch.estimated_time}min` : "-"}
            </td>

            {/* Actions */}
            <td className="px-2 py-2 text-right">
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {(batch.status === "draft" || batch.status === "ready") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStart}
                    disabled={startBatch.isPending}
                    className="h-7 px-2 text-status-active hover:text-status-active hover:bg-status-active/10"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                {batch.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    disabled={completeBatch.isPending}
                    className="h-7 px-3 cta-button text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t("batches.completeBatch")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(true);
                  }}
                  className="h-7 px-2"
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        </CollapsibleTrigger>

        {/* Expanded Operations List */}
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={7} className="p-0">
              <div className="bg-muted/20 border-y border-border/50">
                <table className="w-full text-left">
                  <tbody>
                    {operations.map((bo: any, idx: number) => (
                      <tr
                        key={bo.id}
                        className="border-b border-border/30 last:border-0 text-sm"
                      >
                        <td className="pl-10 pr-2 py-1.5 w-8 text-muted-foreground text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="font-medium">
                            {bo.operation?.part?.part_number || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {bo.operation?.operation_name || "-"}
                        </td>
                        <td className="px-2 py-1.5">
                          {bo.operation?.part?.job?.job_number || "-"}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {bo.operation?.part?.quantity ? (
                            <Badge variant="secondary" className="text-xs">
                              x{bo.operation.part.quantity}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              bo.operation?.status === "completed" &&
                                "bg-status-completed/20 text-status-completed border-status-completed/30",
                              bo.operation?.status === "in_progress" &&
                                "bg-status-active/20 text-status-active border-status-active/30"
                            )}
                          >
                            {bo.operation?.status || "unknown"}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted-foreground">
                          {bo.operation?.estimated_time
                            ? `${bo.operation.estimated_time}min`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {operations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-muted-foreground text-sm italic">
                          {t("batches.noOperationsInBatch")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </CollapsibleContent>
      </Collapsible>

      <BatchOperatorModal
        batch={batch}
        open={showModal}
        onClose={() => setShowModal(false)}
        onUpdate={onUpdate}
      />
    </>
  );
}
