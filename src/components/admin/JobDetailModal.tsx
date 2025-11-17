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
import { Plus, Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { RoutingVisualization } from "@/components/qrm/RoutingVisualization";
import { useJobRouting } from "@/hooks/useQRMMetrics";

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

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          parts (
            *,
            tasks (
              *,
              stage:stages(name, color)
            )
          )
        `)
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data;
    },
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
            <Label className="text-lg">{t("qrm.routing", "Routing")}</Label>
            <div className="mt-3 border rounded-lg p-4 bg-gray-50">
              <RoutingVisualization routing={routing} loading={routingLoading} />
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
              <p className="mt-1 text-sm text-gray-600">{job?.notes || t("jobs.noNotes")}</p>
            )}
          </div>

          {/* Metadata */}
          {job?.metadata && Object.keys(job.metadata).length > 0 && (
            <div>
              <Label>{t("jobs.customMetadata")}</Label>
              <div className="mt-2 border rounded-md p-3">
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

          {/* Parts and Tasks */}
          <div>
            <Label className="text-lg">{t("jobs.parts")} ({job?.parts?.length || 0})</Label>
            <div className="mt-3 space-y-4">
              {job?.parts?.map((part: any) => (
                <div key={part.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t("parts.partNumber")}# {part.part_number}</h4>
                      <p className="text-sm text-gray-600">
                        {t("parts.material")}: {part.material} | {t("parts.quantity")}: {part.quantity}
                      </p>
                      {part.parent_part_id && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {t("parts.assembly")}
                        </Badge>
                      )}
                    </div>
                    <Badge>{part.status?.replace("_", " ")}</Badge>
                  </div>

                  {/* Tasks */}
                  <div className="mt-3">
                    <Label className="text-sm">{t("jobs.tasks")} ({part.tasks?.length || 0})</Label>
                    <div className="mt-2 space-y-2">
                      {part.tasks?.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: task.stage?.color,
                                backgroundColor: `${task.stage?.color}20`,
                              }}
                            >
                              {task.stage?.name}
                            </Badge>
                            <span>{task.task_name}</span>
                          </div>
                          <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                            {task.status?.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
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
