import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, Edit2, Save, X, CheckCircle2, Clock, Circle, Truck, MapPin, Package, Weight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { PartIssueBadge } from "@/components/issues/PartIssueBadge";
import { IssuesSummarySection } from "@/components/issues/IssuesSummarySection";
import { OperationsFlowVisualization } from "@/components/qrm/OperationsFlowVisualization";
import { useJobRouting } from "@/hooks/useQRMMetrics";
import { ResourceCountBadge } from "@/components/ui/ResourceUsageDisplay";

interface JobDetailModalProps {
  jobId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function JobDetailModal({ jobId, onClose, onUpdate }: JobDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedJob, setEditedJob] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { routing, loading: routingLoading } = useJobRouting(jobId);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          parts (
            *,
            operations (
              *,
              cell:cells(name, color)
            )
          )
        `)
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  const updateJobMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("jobs.jobUpdated"),
        description: t("jobs.jobUpdateSuccess"),
      });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setEditedJob({ ...job });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateJobMutation.mutate({
      customer: editedJob.customer,
      notes: editedJob.notes,
      metadata: editedJob.metadata,
      // Delivery address fields only (weight/volume come from parts)
      delivery_address: editedJob.delivery_address || null,
      delivery_city: editedJob.delivery_city || null,
      delivery_postal_code: editedJob.delivery_postal_code || null,
      delivery_country: editedJob.delivery_country || null,
    });
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">{t("jobs.loadingJobDetails")}</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !job) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8 text-destructive">
            {error ? `Error loading job: ${(error as Error).message}` : "Job not found"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start gap-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              {t("jobs.jobDetails")}: {job?.job_number}
            </DialogTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} className="h-8">
                    <Save className="h-3.5 w-3.5 mr-1.5" /> {t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-8">
                    <X className="h-3.5 w-3.5 mr-1.5" /> {t("common.cancel")}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleEdit} className="h-8">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> {t("common.edit")}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Job Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.customer")}</Label>
              {isEditing ? (
                <Input
                  value={editedJob.customer}
                  onChange={(e) => setEditedJob({ ...editedJob, customer: e.target.value })}
                  className="mt-1.5"
                />
              ) : (
                <p className="mt-1.5 font-semibold text-sm">{job?.customer}</p>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.status")}</Label>
              <div className="mt-1.5">
                <Badge className={`
                  ${job?.status === 'completed' ? 'bg-status-completed text-white' : ''}
                  ${job?.status === 'in_progress' ? 'bg-status-active text-black' : ''}
                  ${job?.status === 'not_started' ? 'bg-status-pending text-white' : ''}
                  text-xs font-medium
                `}>
                  {job?.status?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.dueDate")}</Label>
              <p className="mt-1.5 font-medium text-sm">
                {format(new Date(job?.due_date_override || job?.due_date), "MMM dd, yyyy")}
                {job?.due_date_override && (
                  <Badge variant="outline" className="ml-2 text-xs py-0 h-5">
                    {t("jobs.overridden")}
                  </Badge>
                )}
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.created")}</Label>
              <p className="mt-1.5 text-sm">{format(new Date(job?.created_at), "MMM dd, yyyy HH:mm")}</p>
            </div>
          </div>

          {/* Routing Visualization */}
          <div>
            <Label className="text-sm font-semibold">{t("qrm.operationsFlow", "Operations Flow")}</Label>
            <div className="mt-2 border border-white/10 rounded-xl p-3 bg-[rgba(17,25,40,0.5)] backdrop-blur-sm">
              <OperationsFlowVisualization routing={routing} loading={routingLoading} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>{t("jobs.notes")}</Label>
            {isEditing ? (
              <Textarea
                value={editedJob.notes || ""}
                onChange={(e) => setEditedJob({ ...editedJob, notes: e.target.value })}
                rows={3}
              />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{job?.notes || t("jobs.noNotes")}</p>
            )}
          </div>

          {/* Delivery Information */}
          <div className="border border-white/10 rounded-xl p-4 bg-[rgba(17,25,40,0.3)] backdrop-blur-sm">
            <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4" />
              {t("jobs.deliveryInfo")}
            </Label>

            {isEditing ? (
              <div className="space-y-4">
                {/* Delivery Address */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">{t("jobs.deliveryAddress")}</Label>
                    <Input
                      value={editedJob.delivery_address || ""}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_address: e.target.value })}
                      placeholder={t("jobs.deliveryAddressPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("jobs.deliveryCity")}</Label>
                    <Input
                      value={editedJob.delivery_city || ""}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_city: e.target.value })}
                      placeholder={t("jobs.deliveryCityPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("jobs.deliveryPostalCode")}</Label>
                    <Input
                      value={editedJob.delivery_postal_code || ""}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_postal_code: e.target.value })}
                      placeholder={t("jobs.deliveryPostalCodePlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("jobs.deliveryCountry")}</Label>
                    <Input
                      value={editedJob.delivery_country || "NL"}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_country: e.target.value })}
                      placeholder="NL"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Display mode - Address */}
                {(job?.delivery_address || job?.delivery_city || job?.delivery_postal_code) ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      {job?.delivery_address && <p>{job.delivery_address}</p>}
                      <p className="text-muted-foreground">
                        {[job?.delivery_postal_code, job?.delivery_city, job?.delivery_country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t("jobs.noDeliveryAddress")}
                  </p>
                )}

                {/* Aggregated weight/volume from parts (read-only) */}
                {job?.parts && job.parts.length > 0 && (() => {
                  const totalWeight = job.parts.reduce((sum: number, part: any) =>
                    sum + ((part.weight_kg || 0) * (part.quantity || 1)), 0);
                  const totalVolume = job.parts.reduce((sum: number, part: any) => {
                    if (part.length_mm && part.width_mm && part.height_mm) {
                      const volumeM3 = (part.length_mm * part.width_mm * part.height_mm) / 1000000000;
                      return sum + (volumeM3 * (part.quantity || 1));
                    }
                    return sum;
                  }, 0);

                  if (totalWeight > 0 || totalVolume > 0) {
                    return (
                      <div className="flex gap-4 text-sm pt-2 border-t border-white/5">
                        {totalWeight > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{totalWeight.toFixed(2)} kg</span>
                            <span className="text-xs text-muted-foreground">({t("jobs.fromParts")})</span>
                          </div>
                        )}
                        {totalVolume > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{totalVolume.toFixed(6)} m³</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* Metadata */}
          {job?.metadata && Object.keys(job.metadata).length > 0 && (
            <div>
              <Label className="text-sm font-semibold">{t("jobs.customMetadata")}</Label>
              <div className="mt-2 border border-white/10 rounded-xl p-3 bg-[rgba(17,25,40,0.5)] backdrop-blur-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(job.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-2">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide min-w-fit">{key}:</dt>
                      <dd className="font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* NCRs / Issues Summary */}
          <IssuesSummarySection jobId={jobId} />

          {/* Parts and Tasks */}
          <div>
            <Label className="text-sm font-semibold">{t("jobs.parts")} ({job?.parts?.length || 0})</Label>
            <div className="mt-2 space-y-3">
              {job?.parts?.map((part: any) => (
                <div key={part.id} className="border border-white/10 rounded-xl p-3 bg-[rgba(17,25,40,0.3)] backdrop-blur-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm">{t("parts.partNumber")}# {part.part_number}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t("parts.material")}: {part.material} | {t("parts.quantity")}: {part.quantity}
                      </p>
                      <div className="flex gap-1.5 mt-1">
                        {part.parent_part_id && (
                          <Badge variant="outline" className="text-xs py-0 h-5">
                            {t("parts.assembly")}
                          </Badge>
                        )}
                        <PartIssueBadge partId={part.id} size="sm" />
                      </div>
                    </div>
                    <Badge className={`
                      ${part.status === 'completed' ? 'bg-status-completed text-white' : ''}
                      ${part.status === 'in_progress' ? 'bg-status-active text-black' : ''}
                      ${part.status === 'not_started' ? 'bg-status-pending text-white' : ''}
                      text-xs font-medium py-0.5 h-6
                    `}>
                      {part.status?.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Operations */}
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      {t("jobs.operations", "Operations")} ({part.operations?.length || 0})
                    </Label>
                    <div className="mt-1.5 space-y-1.5">
                      {part.operations?.map((operation: any, index: number) => {
                        const isCompleted = operation.status === "completed";
                        const isInProgress = operation.status === "in_progress";
                        const cellColor = operation.cell?.color || '#6B7280';
                        const completedCount = part.operations.filter((op: any) => op.status === "completed").length;
                        const totalCount = part.operations.length;

                        return (
                          <div
                            key={operation.id}
                            className={`
                              flex items-center justify-between p-2 rounded-lg text-xs
                              border border-white/5 transition-all duration-200
                              ${isCompleted
                                ? 'bg-[rgba(52,168,83,0.05)]'
                                : isInProgress
                                  ? 'bg-[rgba(30,144,255,0.08)]'
                                  : 'bg-[rgba(255,255,255,0.02)]'}
                            `}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Status indicator */}
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-status-completed" />
                                ) : isInProgress ? (
                                  <Clock className="h-3.5 w-3.5 text-brand-primary" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                                )}
                              </div>

                              {/* Operation number and cell */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="font-semibold text-muted-foreground text-[10px]">
                                  {index + 1}/{totalCount}
                                </span>
                                <div
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                                  style={{
                                    backgroundColor: `${cellColor}15`,
                                    color: cellColor,
                                    borderLeft: `2px solid ${cellColor}`,
                                  }}
                                >
                                  {operation.cell?.name}
                                </div>
                              </div>

                              {/* Operation name */}
                              <span className={`font-medium truncate ${isCompleted ? 'text-muted-foreground/70' : ''}`}>
                                {operation.operation_name}
                              </span>

                              {/* Resource count badge */}
                              <div className="flex-shrink-0">
                                <ResourceCountBadge operationId={operation.id} />
                              </div>
                            </div>

                            {/* Timing Info */}
                            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground ml-7">
                              <div>
                                <span className="font-semibold">{t("capacity.scheduled")}:</span> {operation.planned_start ? format(new Date(operation.planned_start), 'MMM d') : '-'}
                              </div>
                              <div>
                                <span className="font-semibold">Setup:</span> {operation.setup_time || 0}m
                              </div>
                              <div>
                                <span className="font-semibold">Run:</span> {operation.run_time_per_unit || 0}m/u
                              </div>
                              <div>
                                <span className="font-semibold">Est Total:</span> {operation.estimated_time || 0}m
                              </div>
                            </div>

                            {/* Compact status badge */}
                            <Badge
                              className={`
                                ml-2 flex-shrink-0 text-[10px] px-2 py-0 h-5 font-medium
                                ${isCompleted ? 'bg-status-completed/20 text-status-completed border-status-completed/30' : ''}
                                ${isInProgress ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : ''}
                                ${!isCompleted && !isInProgress ? 'bg-muted/50 text-muted-foreground border-muted' : ''}
                              `}
                              variant="outline"
                            >
                              {isCompleted ? '✓' : isInProgress ? '⟳' : '○'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
