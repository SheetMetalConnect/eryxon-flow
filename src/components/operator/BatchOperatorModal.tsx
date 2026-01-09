import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useStartBatch, useCompleteBatch } from "@/hooks/useBatches";
import type { BatchWithOperations } from "@/types/batches";
import { BATCH_STATUS_CONFIG, BATCH_TYPE_CONFIG } from "@/types/batches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Layers,
  Play,
  CheckCircle2,
  Package,
  Clock,
  Percent,
  Zap,
  Cylinder,
  Scissors,
  Sparkles,
  Calendar,
  User,
} from "lucide-react";
import type { BatchType } from "@/types/batches";

interface BatchOperatorModalProps {
  batch: BatchWithOperations;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const BATCH_TYPE_ICONS: Record<BatchType, React.ElementType> = {
  laser_nesting: Zap,
  tube_batch: Cylinder,
  saw_batch: Scissors,
  finishing_batch: Sparkles,
  general: Layers,
};

export default function BatchOperatorModal({
  batch,
  open,
  onClose,
  onUpdate,
}: BatchOperatorModalProps) {
  const { t } = useTranslation();
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

  const handleStart = async () => {
    await startBatch.mutateAsync(batch.id);
    onUpdate?.();
  };

  const handleComplete = async () => {
    await completeBatch.mutateAsync(batch.id);
    onUpdate?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-brand-primary/10">
                <TypeIcon className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{batch.batch_number}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{t(`batches.types.${batch.batch_type}`)}</Badge>
                  <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
                    {t(`batches.status.${batch.status}`)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-250px)]">
          <div className="space-y-6 pr-4">
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Package className="h-4 w-4" />
                  {t("batches.operationsCount")}
                </div>
                <div className="text-2xl font-bold mt-1">{batch.operations_count}</div>
              </div>

              {batch.material && (
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground text-sm">{t("batches.material")}</div>
                  <div className="text-lg font-medium mt-1">
                    {batch.material}
                    {batch.thickness_mm && (
                      <span className="text-sm text-muted-foreground ml-1">
                        ({batch.thickness_mm}mm)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {nestingMeta?.efficiency_percent && (
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Percent className="h-4 w-4" />
                    {t("batches.nesting.efficiency")}
                  </div>
                  <div className="text-2xl font-bold mt-1 text-status-completed">
                    {nestingMeta.efficiency_percent}%
                  </div>
                </div>
              )}

              {batch.estimated_time && (
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    {t("batches.estimatedTime")}
                  </div>
                  <div className="text-2xl font-bold mt-1">{batch.estimated_time} min</div>
                </div>
              )}
            </div>

            {/* Progress (when in progress) */}
            {batch.status === "in_progress" && totalOps > 0 && (
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{t("common.progress")}</span>
                  <span className="text-muted-foreground">
                    {completedOps}/{totalOps} ({Math.round(progressPercent)}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>
            )}

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">{t("batches.createdAt")}</div>
                  <div className="font-medium">
                    {format(new Date(batch.created_at), "dd MMM yyyy HH:mm")}
                  </div>
                </div>
              </div>
              {batch.started_at && (
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-status-active" />
                  <div>
                    <div className="text-muted-foreground">{t("batches.startedAt")}</div>
                    <div className="font-medium">
                      {format(new Date(batch.started_at), "dd MMM yyyy HH:mm")}
                    </div>
                    {batch.started_by_user && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {batch.started_by_user.full_name}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Operations List */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                {t("batches.operationsInBatch")}
              </h3>
              {operations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("batches.noOperationsInBatch")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{t("parts.partNumber")}</TableHead>
                      <TableHead>{t("jobs.job")}</TableHead>
                      <TableHead>{t("parts.quantity")}</TableHead>
                      <TableHead>{t("operations.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((bo: any, idx) => (
                      <TableRow key={bo.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">
                          {bo.operation?.part?.part_number || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{bo.operation?.part?.job?.job_number || "-"}</div>
                          {bo.operation?.part?.job?.customer && (
                            <div className="text-xs text-muted-foreground">
                              {bo.operation.part.job.customer}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {bo.operation?.part?.quantity ? `x${bo.operation.part.quantity}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              bo.operation?.status === "completed"
                                ? "bg-status-completed/20 text-status-completed border-status-completed/30"
                                : bo.operation?.status === "in_progress"
                                ? "bg-status-active/20 text-status-active border-status-active/30"
                                : ""
                            }
                          >
                            {bo.operation?.status || "unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {(batch.status === "draft" || batch.status === "ready") && (
            <Button
              onClick={handleStart}
              disabled={startBatch.isPending}
              className="flex-1 cta-button"
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              {startBatch.isPending ? "Starting..." : t("batches.startBatch")}
            </Button>
          )}
          {batch.status === "in_progress" && (
            <Button
              onClick={handleComplete}
              disabled={completeBatch.isPending}
              className="flex-1 cta-button"
              size="lg"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {completeBatch.isPending ? "Completing..." : t("batches.completeBatch")}
            </Button>
          )}
          {batch.status === "completed" && (
            <div className="flex-1 text-center py-3 text-status-completed font-medium">
              <CheckCircle2 className="h-5 w-5 inline mr-2" />
              {t("batches.status.completed")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
