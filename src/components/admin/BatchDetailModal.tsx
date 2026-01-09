import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useBatch, useStartBatch, useCompleteBatch, useCancelBatch, useRemoveOperationFromBatch } from "@/hooks/useBatches";
import { BATCH_STATUS_CONFIG, BATCH_TYPE_CONFIG, BatchStatus } from "@/types/batches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  XCircle,
  Clock,
  Calendar,
  User,
  Package,
  Hash,
  Percent,
  X,
  ExternalLink,
} from "lucide-react";

interface BatchDetailModalProps {
  batchId: string | null;
  onClose: () => void;
}

export default function BatchDetailModal({ batchId, onClose }: BatchDetailModalProps) {
  const { t } = useTranslation();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [removeOpId, setRemoveOpId] = useState<string | null>(null);

  const { data: batch, isLoading } = useBatch(batchId);
  const startBatch = useStartBatch();
  const completeBatch = useCompleteBatch();
  const cancelBatch = useCancelBatch();
  const removeOperation = useRemoveOperationFromBatch();

  if (!batchId) return null;

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="glass-card max-w-3xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!batch) return null;

  const statusConfig = BATCH_STATUS_CONFIG[batch.status];
  const typeConfig = BATCH_TYPE_CONFIG[batch.batch_type];
  const nestingMeta = batch.nesting_metadata as Record<string, any> | null;

  const handleStart = async () => {
    await startBatch.mutateAsync(batch.id);
  };

  const handleComplete = async () => {
    await completeBatch.mutateAsync(batch.id);
  };

  const handleCancel = async () => {
    await cancelBatch.mutateAsync(batch.id);
    setCancelConfirmOpen(false);
  };

  const handleRemoveOperation = async () => {
    if (!removeOpId) return;
    await removeOperation.mutateAsync({
      batch_id: batch.id,
      operation_id: removeOpId,
    });
    setRemoveOpId(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-primary/10">
                <Layers className="h-5 w-5 text-brand-primary" />
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

            {/* Action buttons based on status */}
            <div className="flex gap-2">
              {(batch.status === "draft" || batch.status === "ready") && (
                <Button onClick={handleStart} disabled={startBatch.isPending} className="cta-button">
                  <Play className="h-4 w-4 mr-2" />
                  {t("batches.startBatch")}
                </Button>
              )}
              {batch.status === "in_progress" && (
                <>
                  <Button onClick={handleComplete} disabled={completeBatch.isPending} className="cta-button">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("batches.completeBatch")}
                  </Button>
                  <Button variant="outline" onClick={() => setCancelConfirmOpen(true)} disabled={cancelBatch.isPending}>
                    <XCircle className="h-4 w-4 mr-2" />
                    {t("batches.cancelBatch")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Package className="h-4 w-4" />
                    {t("batches.operationsCount")}
                  </div>
                  <div className="text-2xl font-bold mt-1">{batch.operations_count}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Hash className="h-4 w-4" />
                    {t("batches.cell")}
                  </div>
                  <div className="text-lg font-medium mt-1">{batch.cell?.name || "-"}</div>
                </CardContent>
              </Card>

              {batch.material && (
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="text-muted-foreground text-sm">{t("batches.material")}</div>
                    <div className="text-lg font-medium mt-1">
                      {batch.material}
                      {batch.thickness_mm && ` (${batch.thickness_mm}mm)`}
                    </div>
                  </CardContent>
                </Card>
              )}

              {nestingMeta?.efficiency_percent && (
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Percent className="h-4 w-4" />
                      {t("batches.nesting.efficiency")}
                    </div>
                    <div className="text-2xl font-bold mt-1 text-status-completed">
                      {nestingMeta.efficiency_percent}%
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Timestamps */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("common.timeline")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t("batches.createdAt")}</div>
                    <div className="font-medium">
                      {format(new Date(batch.created_at), "dd MMM yyyy HH:mm")}
                    </div>
                    {batch.created_by_user && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        {batch.created_by_user.full_name}
                      </div>
                    )}
                  </div>
                  {batch.started_at && (
                    <div>
                      <div className="text-muted-foreground">{t("batches.startedAt")}</div>
                      <div className="font-medium">
                        {format(new Date(batch.started_at), "dd MMM yyyy HH:mm")}
                      </div>
                      {batch.started_by_user && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {batch.started_by_user.full_name}
                        </div>
                      )}
                    </div>
                  )}
                  {batch.completed_at && (
                    <div>
                      <div className="text-muted-foreground">{t("batches.completedAt")}</div>
                      <div className="font-medium text-status-completed">
                        {format(new Date(batch.completed_at), "dd MMM yyyy HH:mm")}
                      </div>
                    </div>
                  )}
                  {batch.estimated_time && (
                    <div>
                      <div className="text-muted-foreground">{t("batches.estimatedTime")}</div>
                      <div className="font-medium">{batch.estimated_time} min</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* External Reference */}
            {(batch.external_id || batch.external_source) && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t("batches.externalSource")}:</span>
                    <span className="font-medium">{batch.external_source}</span>
                    {batch.external_id && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-mono text-sm">{batch.external_id}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {batch.notes && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("batches.notes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{batch.notes}</p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Operations in Batch */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t("batches.operationsInBatch")}
                  </span>
                  <Badge variant="secondary">{batch.batch_operations?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!batch.batch_operations?.length ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t("batches.noOperationsInBatch")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t("parts.partNumber")}</TableHead>
                        <TableHead>{t("operations.title")}</TableHead>
                        <TableHead>{t("jobs.job")}</TableHead>
                        <TableHead>{t("parts.quantity")}</TableHead>
                        <TableHead>{t("operations.status")}</TableHead>
                        {batch.status === "draft" && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.batch_operations.map((bo: any, idx) => (
                        <TableRow key={bo.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {bo.operation?.part?.part_number || "-"}
                          </TableCell>
                          <TableCell>{bo.operation?.operation_name || "-"}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {bo.operation?.part?.job?.job_number || "-"}
                            </div>
                            {bo.operation?.part?.job?.customer && (
                              <div className="text-xs text-muted-foreground">
                                {bo.operation.part.job.customer}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {bo.operation?.part?.quantity ? (
                              <Badge variant="secondary">x{bo.operation.part.quantity}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={bo.operation?.status === "completed" ? "default" : "outline"}
                              className={
                                bo.operation?.status === "completed"
                                  ? "bg-status-completed text-white"
                                  : bo.operation?.status === "in_progress"
                                  ? "border-status-active text-status-active"
                                  : ""
                              }
                            >
                              {bo.operation?.status || "unknown"}
                            </Badge>
                          </TableCell>
                          {batch.status === "draft" && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRemoveOpId(bo.operation_id)}
                                disabled={removeOperation.isPending}
                              >
                                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("batches.cancelBatch")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("batches.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              {t("batches.cancelBatch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Operation Confirmation Dialog */}
      <AlertDialog open={!!removeOpId} onOpenChange={() => setRemoveOpId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("batches.removeOperation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("batches.removeOperation")}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveOperation} className="bg-destructive text-destructive-foreground">
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
