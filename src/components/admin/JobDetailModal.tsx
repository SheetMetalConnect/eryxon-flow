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
import { Plus, Edit2, Save, X, CheckCircle2, Clock, Circle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { PartIssueBadge } from "@/components/issues/PartIssueBadge";
import { IssuesSummarySection } from "@/components/issues/IssuesSummarySection";
import { OperationsFlowVisualization } from "@/components/qrm/OperationsFlowVisualization";
import { useJobRouting } from "@/hooks/useQRMMetrics";
import IssueForm from "@/components/operator/IssueForm";

interface JobDetailModalProps {
  jobId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function JobDetailModal({ jobId, onClose, onUpdate }: JobDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedJob, setEditedJob] = useState<any>(null);
  const [issueOperationId, setIssueOperationId] = useState<string | null>(null);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>{t("jobs.jobDetails")}: {job?.job_number}</DialogTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" /> {t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" /> {t("common.cancel")}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-2" /> {t("common.edit")}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("jobs.customer")}</Label>
              {isEditing ? (
                <Input
                  value={editedJob.customer}
                  onChange={(e) => setEditedJob({ ...editedJob, customer: e.target.value })}
                />
              ) : (
                <p className="mt-1 font-medium">{job?.customer}</p>
              )}
            </div>

            <div>
              <Label>{t("jobs.status")}</Label>
              <div className="mt-1">
                <Badge>{job?.status?.replace("_", " ").toUpperCase()}</Badge>
              </div>
            </div>

            <div>
              <Label>{t("jobs.dueDate")}</Label>
              <p className="mt-1 font-medium">
                {format(new Date(job?.due_date_override || job?.due_date), "MMM dd, yyyy")}
                {job?.due_date_override && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {t("jobs.overridden")}
                  </Badge>
                )}
              </p>
            </div>

            <div>
              <Label>{t("jobs.created")}</Label>
              <p className="mt-1">{format(new Date(job?.created_at), "MMM dd, yyyy HH:mm")}</p>
            </div>
          </div>

          {/* Routing Visualization */}
          <div>
            <Label className="text-lg">{t("qrm.operationsFlow", "Operations Flow")}</Label>
            <div className="mt-3 border rounded-lg p-4 bg-muted">
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

          {/* Metadata */}
          {job?.metadata && Object.keys(job.metadata).length > 0 && (
            <div>
              <Label>{t("jobs.customMetadata")}</Label>
              <div className="mt-2 border rounded-md p-3 bg-muted">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(job.metadata).map(([key, value]) => (
                      <tr key={key}>
                        <td className="font-medium py-1 pr-4">{key}:</td>
                        <td className="py-1">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NCRs / Issues Summary */}
          <IssuesSummarySection jobId={jobId} />

          {/* Parts and Tasks */}
          <div>
            <Label className="text-lg">{t("jobs.parts")} ({job?.parts?.length || 0})</Label>
            <div className="mt-3 space-y-4">
              {job?.parts?.map((part: any) => (
                <div key={part.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t("parts.partNumber")}# {part.part_number}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("parts.material")}: {part.material} | {t("parts.quantity")}: {part.quantity}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {part.parent_part_id && (
                          <Badge variant="outline" className="text-xs">
                            {t("parts.assembly")}
                          </Badge>
                        )}
                        <PartIssueBadge partId={part.id} size="sm" />
                      </div>
                    </div>
                    <Badge>{part.status?.replace("_", " ")}</Badge>
                  </div>

                  {/* Operations */}
                  <div className="mt-3">
                    <Label className="text-sm">{t("jobs.operations", "Operations")} ({part.operations?.length || 0})</Label>
                    <div className="mt-2 space-y-2">
                      {part.operations?.map((operation: any, index: number) => {
                        const isCompleted = operation.status === "completed";
                        const isInProgress = operation.status === "in_progress";
                        const cellColor = operation.cell?.color || '#6B7280';

                        return (
                          <div
                            key={operation.id}
                            className={`
                              flex items-center justify-between p-3 rounded-lg text-sm
                              border-l-4 transition-all duration-200
                              ${isCompleted
                                ? 'bg-alert-success-bg'
                                : isInProgress
                                  ? 'bg-alert-info-bg shadow-sm'
                                  : 'bg-muted'}
                            `}
                            style={{
                              borderLeftColor: cellColor,
                            }}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {/* Status icon */}
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              ) : isInProgress ? (
                                <Clock className="h-4 w-4 text-brand-primary animate-pulse" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}

                              {/* Cell badge */}
                              <div
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${cellColor}20`,
                                  color: cellColor,
                                }}
                              >
                                {operation.cell?.name}
                              </div>

                              {/* Operation name */}
                              <span className={`font-medium ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                {operation.operation_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Report Issue Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIssueOperationId(operation.id)}
                                title={t("operations.reportIssue")}
                                className="h-8 px-2"
                              >
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              </Button>

                              {/* Status badge */}
                              <Badge
                                variant={isCompleted ? "outline" : isInProgress ? "default" : "secondary"}
                                className={`
                                  ${isCompleted ? 'text-success border-alert-success-border' : ''}
                                  ${isInProgress ? 'bg-brand-primary' : ''}
                                `}
                              >
                                {operation.status?.replace("_", " ")}
                              </Badge>
                            </div>
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

        {/* Issue Form */}
        {issueOperationId && (
          <IssueForm
            operationId={issueOperationId}
            open={!!issueOperationId}
            onOpenChange={(open) => !open && setIssueOperationId(null)}
            onSuccess={() => {
              setIssueOperationId(null);
              onUpdate();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
