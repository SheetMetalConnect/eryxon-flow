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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { Plus, Edit2, Save, X, CheckCircle2, Clock, Circle, Truck, MapPin, Package, Weight, ChevronDown, ChevronRight } from "lucide-react";
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

  // Calculate summary stats
  const partsCount = job?.parts?.length || 0;
  const operationsCount = job?.parts?.reduce((sum: number, p: any) => sum + (p.operations?.length || 0), 0) || 0;
  const completedOps = job?.parts?.reduce((sum: number, p: any) =>
    sum + (p.operations?.filter((op: any) => op.status === "completed").length || 0), 0) || 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {t("jobs.jobDetails")}: {job?.job_number}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{job?.customer}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`
                ${job?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
                ${job?.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                ${job?.status === 'not_started' ? 'bg-slate-500/10 text-slate-600 border-slate-500/20' : ''}
              `} variant="outline">
                {job?.status?.replace("_", " ").toUpperCase()}
              </Badge>
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} className="h-8">
                    <Save className="h-3.5 w-3.5 mr-1.5" /> {t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-8">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={handleEdit} className="h-8">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> {t("common.edit")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content with Tabs */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 border-b">
            <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-4">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3">
                {t("common.overview", "Overview")}
              </TabsTrigger>
              <TabsTrigger value="parts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3">
                {t("jobs.parts")} ({partsCount})
              </TabsTrigger>
              <TabsTrigger value="delivery" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3">
                {t("jobs.deliveryInfo", "Delivery")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 sm:p-6 space-y-5 m-0">
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.dueDate")}</p>
                  <p className="mt-1 font-semibold text-sm">
                    {format(new Date(job?.due_date_override || job?.due_date), "MMM dd, yyyy")}
                  </p>
                  {job?.due_date_override && (
                    <Badge variant="outline" className="mt-1 text-[10px] py-0 h-4">{t("jobs.overridden")}</Badge>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.parts")}</p>
                  <p className="mt-1 font-semibold text-sm">{partsCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.operations", "Operations")}</p>
                  <p className="mt-1 font-semibold text-sm">{completedOps}/{operationsCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.created")}</p>
                  <p className="mt-1 font-semibold text-sm">{format(new Date(job?.created_at), "MMM dd")}</p>
                </div>
              </div>

              {/* Operations Flow */}
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("qrm.operationsFlow", "Operations Flow")}</h3>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <OperationsFlowVisualization routing={routing} loading={routingLoading} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("jobs.notes")}</h3>
                {isEditing ? (
                  <Textarea
                    value={editedJob.notes || ""}
                    onChange={(e) => setEditedJob({ ...editedJob, notes: e.target.value })}
                    rows={3}
                    className="bg-background"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border">
                    {job?.notes || t("jobs.noNotes")}
                  </p>
                )}
              </div>

              {/* Metadata */}
              {job?.metadata && Object.keys(job.metadata).length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                    {t("jobs.customMetadata")} ({Object.keys(job.metadata).length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {Object.entries(job.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-baseline gap-2">
                            <dt className="text-xs text-muted-foreground uppercase tracking-wide">{key}:</dt>
                            <dd className="font-medium">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Issues Summary */}
              <IssuesSummarySection jobId={jobId} />
            </TabsContent>

            {/* Parts Tab */}
            <TabsContent value="parts" className="p-4 sm:p-6 space-y-3 m-0">
              {job?.parts?.map((part: any) => {
                const partCompletedOps = part.operations?.filter((op: any) => op.status === "completed").length || 0;
                const partTotalOps = part.operations?.length || 0;

                return (
                  <div key={part.id} className="border rounded-lg overflow-hidden">
                    {/* Part Header */}
                    <div className="flex items-center justify-between p-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-semibold text-sm">#{part.part_number}</h4>
                          <p className="text-xs text-muted-foreground">
                            {part.material} · Qty: {part.quantity}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          {part.parent_part_id && (
                            <Badge variant="outline" className="text-[10px] py-0 h-5">{t("parts.assembly")}</Badge>
                          )}
                          <PartIssueBadge partId={part.id} size="sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{partCompletedOps}/{partTotalOps} ops</span>
                        <Badge className={`text-[10px] py-0.5 h-5
                          ${part.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
                          ${part.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                          ${part.status === 'not_started' ? 'bg-slate-500/10 text-slate-600 border-slate-500/20' : ''}
                        `} variant="outline">
                          {part.status?.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    {/* Operations List - Simplified */}
                    {part.operations && part.operations.length > 0 && (
                      <div className="divide-y">
                        {part.operations.map((operation: any, index: number) => {
                          const isCompleted = operation.status === "completed";
                          const isInProgress = operation.status === "in_progress";
                          const cellColor = operation.cell?.color || '#6B7280';

                          return (
                            <div key={operation.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/20 transition-colors">
                              {/* Status Icon */}
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : isInProgress ? (
                                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                              )}

                              {/* Sequence */}
                              <span className="text-xs text-muted-foreground w-6 shrink-0">{index + 1}.</span>

                              {/* Cell Badge */}
                              <div
                                className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                                style={{ backgroundColor: `${cellColor}15`, color: cellColor }}
                              >
                                {operation.cell?.name || 'No cell'}
                              </div>

                              {/* Operation Name */}
                              <span className={`flex-1 truncate ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                {operation.operation_name}
                              </span>

                              {/* Resource Badge */}
                              <ResourceCountBadge operationId={operation.id} />

                              {/* Time (desktop only) */}
                              <span className="text-xs text-muted-foreground hidden md:block w-16 text-right">
                                {operation.estimated_time || 0}m
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* Delivery Tab */}
            <TabsContent value="delivery" className="p-4 sm:p-6 space-y-4 m-0">
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>{t("jobs.deliveryAddress")}</Label>
                    <Input
                      value={editedJob.delivery_address || ""}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_address: e.target.value })}
                      placeholder={t("jobs.deliveryAddressPlaceholder")}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>{t("jobs.deliveryCity")}</Label>
                    <Input
                      value={editedJob.delivery_city || ""}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_city: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>{t("jobs.deliveryPostalCode")}</Label>
                    <Input
                      value={editedJob.delivery_postal_code || ""}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_postal_code: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>{t("jobs.deliveryCountry")}</Label>
                    <Input
                      value={editedJob.delivery_country || "NL"}
                      onChange={(e) => setEditedJob({ ...editedJob, delivery_country: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Address Display */}
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      {(job?.delivery_address || job?.delivery_city) ? (
                        <div>
                          {job?.delivery_address && <p className="font-medium">{job.delivery_address}</p>}
                          <p className="text-sm text-muted-foreground">
                            {[job?.delivery_postal_code, job?.delivery_city, job?.delivery_country].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{t("jobs.noDeliveryAddress")}</p>
                      )}
                    </div>
                  </div>

                  {/* Weight/Volume Summary */}
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
                        <div className="grid grid-cols-2 gap-4">
                          {totalWeight > 0 && (
                            <div className="border rounded-lg p-4 bg-muted/20">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Weight className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wide">{t("parts.totalWeight", "Total Weight")}</span>
                              </div>
                              <p className="text-xl font-semibold">{totalWeight.toFixed(2)} kg</p>
                            </div>
                          )}
                          {totalVolume > 0 && (
                            <div className="border rounded-lg p-4 bg-muted/20">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Package className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wide">{t("parts.totalVolume", "Total Volume")}</span>
                              </div>
                              <p className="text-xl font-semibold">{totalVolume.toFixed(4)} m³</p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
