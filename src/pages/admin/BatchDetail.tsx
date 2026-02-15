import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft,
  Layers,
  Play,
  Square,
  Clock,
  CheckCircle2,
  Timer,
  Package,
  Divide,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Edit,
  Plus,
  Upload,
  MoreVertical,
  Trash2,
  FileText,
  ShoppingCart,
  FileCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useBatch,
  useBatchOperations,
  useUpdateBatchStatus,
  useRaiseMaterialRequirement,
  useSubBatches,
  useBatchRequirements,
  useCreateBatchRequirement,
  useUpdateBatch,
  type BatchStatus
} from "@/hooks/useBatches";
import {
  useBatchActiveTimer,
  useStartBatchTimer,
  useStopBatchTimer,
} from "@/hooks/useBatchTimeTracking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono text-3xl font-bold tabular-nums">{elapsed}</span>
  );
}

const STATUS_COLORS: Record<BatchStatus, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  ready: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: batch, isLoading: batchLoading } = useBatch(id);
  const { data: batchOperations, isLoading: opsLoading } = useBatchOperations(id);
  const { data: subBatches, isLoading: subBatchesLoading } = useSubBatches(id);
  const { data: requirements, isLoading: reqLoading } = useBatchRequirements(id);
  const { data: activeTimer } = useBatchActiveTimer(id);

  const startTimer = useStartBatchTimer();
  const stopTimer = useStopBatchTimer();
  const updateStatus = useUpdateBatchStatus();
  const updateBatch = useUpdateBatch();
  const createRequirement = useCreateBatchRequirement();

  // Local state for modals/inputs
  const [isRequirementDialogOpen, setIsRequirementDialogOpen] = useState(false);
  const [newReqMaterial, setNewReqMaterial] = useState("");
  const [newReqQuantity, setNewReqQuantity] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  if (batchLoading || opsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Clock className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="outline" onClick={() => navigate("/admin/batches")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <p className="mt-4 text-muted-foreground">{t("batches.notFound")}</p>
      </div>
    );
  }

  const isTimerActive = !!activeTimer?.isActive;
  const canStartTimer =
    !isTimerActive &&
    batchOperations &&
    batchOperations.length > 0 &&
    batch.status !== "completed" &&
    batch.status !== "cancelled";
  const operationsCount = batchOperations?.length || 0;

  const statusKey =
    batch.status === "draft"
      ? "batches.status.draft"
      : batch.status === "ready"
        ? "batches.status.ready"
        : batch.status === "in_progress"
          ? "batches.status.inProgress"
          : batch.status === "completed"
            ? "batches.status.completed"
            : batch.status === "cancelled"
              ? "batches.status.cancelled"
              : "batches.status.blocked";

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'nesting' | 'layout') => {
    try {
      setUploadingImage(true);
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${batch.id}/${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('batch-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Use signed URL for private bucket (expires in 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('batch-images')
        .createSignedUrl(filePath, 31536000); // 1 year in seconds

      if (signedUrlError || !signedUrlData) {
        throw signedUrlError || new Error('Failed to generate signed URL');
      }

      await updateBatch.mutateAsync({
        id: batch.id,
        updates: {
          [type === 'nesting' ? 'nesting_image_url' : 'layout_image_url']: signedUrlData.signedUrl
        }
      });

      toast.success(t("batches.imageUploadSuccess"));
    } catch (error: any) {
      toast.error(t("batches.imageUploadError"), { description: error.message });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddRequirement = async () => {
    if (!newReqMaterial || !newReqQuantity) return;

    await createRequirement.mutateAsync({
      batchId: batch.id,
      materialName: newReqMaterial,
      quantity: parseFloat(newReqQuantity)
    });

    setNewReqMaterial("");
    setNewReqQuantity("");
    setIsRequirementDialogOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/batches")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
          </Button>
          <div className="flex gap-2">
            {/* "Missing Button" Fix: Add Edit Button */}
            <Button variant="outline" onClick={() => navigate(`/admin/batches/${batch.id}/edit`)}> {/* Assuming edit route exists or will exist, or just placeholder */}
              <Edit className="mr-2 h-4 w-4" />
              {t("batches.editBatch")}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="h-7 w-7" />
              {batch.batch_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              {batch.cell?.name}
              {batch.material && ` · ${batch.material}`}
              {batch.thickness_mm && ` (${batch.thickness_mm}mm)`}
            </p>
          </div>
          <Badge className={STATUS_COLORS[batch.status as BatchStatus]}>
            {t(statusKey)}
          </Badge>
        </div>
      </div>

      {/* Batch Information & Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Helper visualizer / Images */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t("batches.visuals")}
            </CardTitle>
            <div className="flex gap-1">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Button variant="ghost" size="sm" asChild disabled={uploadingImage}>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    {uploadingImage ? "..." : t("Add")}
                  </span>
                </Button>
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'nesting')}
              />
            </div>
          </CardHeader>
          <CardContent>
            {batch.nesting_image_url ? (
              <div className="relative group">
                <img
                  src={batch.nesting_image_url}
                  alt="Nesting Layout"
                  className="rounded-md w-full h-auto max-h-[300px] object-contain border"
                />
                <a href={batch.nesting_image_url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border rounded-md border-dashed text-muted-foreground gap-2">
                <ImageIcon className="h-8 w-8 opacity-50" />
                <p className="text-sm">{t("No nesting image available")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements & Info */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t("Material Requirements")}
              </CardTitle>
              <Dialog open={isRequirementDialogOpen} onOpenChange={setIsRequirementDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("batches.addMaterialRequirement")}</DialogTitle>
                    <DialogDescription>{t("batches.specifyMaterial")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>{t("batches.materialName")}</Label>
                      <Input value={newReqMaterial} onChange={(e) => setNewReqMaterial(e.target.value)} placeholder="e.g. Steel Sheet 5mm" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("batches.quantity")}</Label>
                      <Input type="number" value={newReqQuantity} onChange={(e) => setNewReqQuantity(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRequirementDialogOpen(false)}>{t("Cancel")}</Button>
                    <Button onClick={handleAddRequirement}>{t("Add")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {requirements && requirements.length > 0 ? (
                <div className="space-y-2">
                  {requirements.map((req) => (
                    <div key={req.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded border">
                      <span>{req.material_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">x{req.quantity}</Badge>
                        <Badge variant={req.status === 'received' ? 'default' : req.status === 'ordered' ? 'secondary' : 'outline'}>
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("No requirements raised")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("batches.type")}
                </p>
                <p className="font-medium mt-1">
                  {t(`batches.types.${batch.batch_type === "laser_nesting"
                    ? "laserNesting"
                    : batch.batch_type === "tube_batch"
                      ? "tubeBatch"
                      : batch.batch_type === "saw_batch"
                        ? "sawBatch"
                        : batch.batch_type === "finishing_batch"
                          ? "finishingBatch"
                          : "general"
                    }`)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("batches.timeTracking.totalTime")}
                </p>
                <p className="font-medium mt-1">
                  {batch.actual_time
                    ? `${batch.actual_time} ${t("operations.min")}`
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Metadata Display */}
      {batch.nesting_metadata && Object.keys(batch.nesting_metadata).length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCode className="h-4 w-4" />
              {t("Additional Metadata")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-3 rounded-md border font-mono text-sm overflow-x-auto">
              <pre>{JSON.stringify(batch.nesting_metadata, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Sub-Batches / Nesting (Master -> Sheets) */}
      {((subBatches && subBatches.length > 0) || batch.batch_type === 'laser_nesting') && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t("batches.nestedBatchesSheets")}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/batches/new?parentId=${batch.id}`)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("batches.addSheet")}
            </Button>
          </CardHeader>
          <CardContent>
            {subBatches && subBatches.length > 0 ? (
              <div className="space-y-2">
                {subBatches.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/admin/batches/${sub.id}`)}>
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{sub.batch_number}</span>
                      {sub.material && <span className="text-sm text-muted-foreground">({sub.material})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{sub.operations_count} ops</Badge>
                      <Badge className={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">{t("No nested batches yet.")}</p>
            )}
          </CardContent>
        </Card>
      )}


      {/* Batch Time Tracking Card */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {t("batches.timeTracking.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Timer Display */}
            {isTimerActive && activeTimer?.startTime ? (
              <div className="text-center">
                <ElapsedTimer startTime={activeTimer.startTime} />
                <p className="text-sm text-muted-foreground mt-2">
                  {t("batches.timeTracking.distributed", {
                    count: operationsCount,
                  })}
                </p>
              </div>
            ) : batch.actual_time ? (
              <div className="text-center">
                <span className="font-mono text-3xl font-bold">
                  {batch.actual_time} {t("operations.min")}
                </span>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("batches.timeTracking.totalTime")} ·{" "}
                  {operationsCount > 0
                    ? `${Math.round(
                      batch.actual_time / operationsCount
                    )} ${t("operations.min")} ${t(
                      "batches.timeTracking.perOperation"
                    ).toLowerCase()}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>{t("batches.timeTracking.noTimeYet")}</p>
              </div>
            )}

            {/* Distribution Info */}
            {operationsCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-sm">
                <Divide className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("batches.timeTracking.distributionInfo", {
                    count: operationsCount,
                  })}
                </span>
              </div>
            )}

            {/* Start / Stop Buttons */}
            <div className="flex gap-3">
              {canStartTimer && (
                <Button
                  size="lg"
                  onClick={() => id && startTimer.mutate(id)}
                  disabled={startTimer.isPending}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  {startTimer.isPending
                    ? t("common.loading")
                    : t("batches.timeTracking.startBatch")}
                </Button>
              )}
              {isTimerActive && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => id && stopTimer.mutate(id)}
                  disabled={stopTimer.isPending}
                  className="gap-2"
                >
                  <Square className="h-5 w-5" />
                  {stopTimer.isPending
                    ? t("common.loading")
                    : t("batches.timeTracking.stopBatch")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Operations in Batch */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("batches.selectOperations")} ({operationsCount})
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("operations.addOperation")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("batches.addOperationNotAvailable")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          {batchOperations && batchOperations.length > 0 ? (
            <div className="space-y-3">
              {batchOperations.map((bo, index) => (
                <div
                  key={bo.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">
                        {bo.operation?.operation_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bo.operation?.part?.job?.job_number} ·{" "}
                        {bo.operation?.part?.part_number}
                        {bo.operation?.part?.quantity &&
                          ` · ${t("parts.qty")}: ${bo.operation.part.quantity}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bo.operation?.status === "completed" ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-500"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t("operations.status.completed")}
                      </Badge>
                    ) : bo.operation?.status === "in_progress" ? (
                      <Badge
                        variant="secondary"
                        className="bg-orange-500/10 text-orange-500"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        {t("operations.status.inProgress")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {t("operations.status.notStarted")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              {t("batches.noOperationsAvailable")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status Actions */}
      {batch.status !== "completed" && batch.status !== "cancelled" && (
        <div className="flex justify-end gap-3">
          {batch.status === "blocked" ? (
            <Button
              variant="outline"
              onClick={() =>
                updateStatus.mutate({
                  batchId: batch.id,
                  status: "ready",
                })
              }
              disabled={updateStatus.isPending}
            >
              {t("batches.unblock")}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() =>
                updateStatus.mutate({
                  batchId: batch.id,
                  status: "blocked",
                })
              }
              disabled={updateStatus.isPending || batch.status === "in_progress"}
            >
              {t("batches.block")}
            </Button>
          )}

          {(batch.status === "draft" || batch.status === "ready") && (
            <Button
              variant="outline"
              onClick={() =>
                updateStatus.mutate({
                  batchId: batch.id,
                  status: "in_progress",
                })
              }
              disabled={updateStatus.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {t("batches.actions.start")}
            </Button>
          )}
          {batch.status === "in_progress" && !isTimerActive && (
            <Button
              onClick={() =>
                updateStatus.mutate({
                  batchId: batch.id,
                  status: "completed",
                })
              }
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("batches.actions.complete")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
