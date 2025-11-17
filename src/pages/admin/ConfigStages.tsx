import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Trash2, GripVertical, Infinity, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCellQRMMetrics } from "@/hooks/useQRMMetrics";
import { WIPIndicator } from "@/components/qrm/WIPIndicator";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sequence: number;
  active: boolean;
  wip_limit: number | null;
  wip_warning_threshold: number | null;
  enforce_wip_limit: boolean | null;
  show_capacity_warning: boolean | null;
}

interface SortableStageCardProps {
  stage: Stage;
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
  tenantId: string;
  t: any;
}

function SortableStageCard({ stage, onEdit, onDelete, tenantId, t }: SortableStageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div
                className="h-8 w-8 rounded flex-shrink-0"
                style={{ backgroundColor: stage.color || "#94a3b8" }}
              />
              <div className="flex-1">
                <CardTitle>{stage.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline">{t("stages.sequence")}: {stage.sequence}</Badge>
                  <Badge variant={stage.active ? "default" : "secondary"}>
                    {stage.active ? t("stages.active") : t("stages.inactive")}
                  </Badge>
                  {stage.wip_limit !== null ? (
                    <Badge variant="outline" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t("qrm.wipLimit", "WIP Limit")}: {stage.wip_limit}
                      {stage.enforce_wip_limit && " (enforced)"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-gray-500">
                      <Infinity className="h-3 w-3" />
                      {t("qrm.noLimit", "No WIP Limit")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(stage)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(stage)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stage.description && (
            <p className="text-sm text-muted-foreground">{stage.description}</p>
          )}
          {stage.wip_limit !== null && (
            <StageWIPDisplay stageId={stage.id} tenantId={tenantId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfigStages() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    active: true,
    wip_limit: null as number | null,
    wip_warning_threshold: null as number | null,
    enforce_wip_limit: false,
    show_capacity_warning: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadStages();
  }, [profile?.tenant_id]);

  const loadStages = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("cells")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("sequence");

    if (!error && data) {
      setStages(data as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingStage) {
        // Update existing stage
        await supabase
          .from("cells")
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            active: formData.active,
            wip_limit: formData.wip_limit,
            wip_warning_threshold: formData.wip_warning_threshold,
            enforce_wip_limit: formData.enforce_wip_limit,
            show_capacity_warning: formData.show_capacity_warning,
          })
          .eq("id", editingStage.id);

        toast.success(t("stages.stageUpdated"));
      } else {
        // Create new cell
        const maxSequence = Math.max(...stages.map((s) => s.sequence), 0);
        await supabase.from("cells").insert({
          tenant_id: profile.tenant_id,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          sequence: maxSequence + 1,
          active: formData.active,
          wip_limit: formData.wip_limit,
          wip_warning_threshold: formData.wip_warning_threshold,
          enforce_wip_limit: formData.enforce_wip_limit,
          show_capacity_warning: formData.show_capacity_warning,
        });

        toast.success(t("stages.stageCreated"));
      }

      setDialogOpen(false);
      resetForm();
      loadStages();
    } catch (error) {
      toast.error(t("stages.failedToSaveStage"));
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      active: true,
      wip_limit: null,
      wip_warning_threshold: null,
      enforce_wip_limit: false,
      show_capacity_warning: true,
    });
    setEditingStage(null);
  };

  const handleEdit = (stage: Stage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || "",
      color: stage.color || "#3b82f6",
      active: stage.active,
      wip_limit: stage.wip_limit,
      wip_warning_threshold: stage.wip_warning_threshold,
      enforce_wip_limit: stage.enforce_wip_limit ?? false,
      show_capacity_warning: stage.show_capacity_warning ?? true,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (stage: Stage) => {
    setStageToDelete(stage);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!stageToDelete || !profile?.tenant_id) return;

    try {
      // Check if there are operations using this cell
      const { count } = await supabase
        .from("operations")
        .select("*", { count: "exact", head: true })
        .eq("cell_id", stageToDelete.id);

      if (count && count > 0) {
        toast.error(t("stages.cannotDeleteStageWithOperations"));
        setDeleteDialogOpen(false);
        return;
      }

      // Delete the cell
      const { error } = await supabase
        .from("cells")
        .delete()
        .eq("id", stageToDelete.id);

      if (error) throw error;

      toast.success(t("stages.stageDeleted"));
      setDeleteDialogOpen(false);
      setStageToDelete(null);
      loadStages();
    } catch (error) {
      toast.error(t("stages.failedToDeleteStage"));
      console.error(error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);

    const reorderedStages = arrayMove(stages, oldIndex, newIndex);

    // Update local state immediately for better UX
    setStages(reorderedStages);

    // Update sequences in the database
    try {
      const updates = reorderedStages.map((stage, index) => ({
        id: stage.id,
        sequence: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("cells")
          .update({ sequence: update.sequence })
          .eq("id", update.id);

        if (error) {
          throw error;
        }
      }

      toast.success(t("stages.stagesReordered"));
    } catch (error) {
      toast.error(t("stages.failedToReorderStages"));
      console.error(error);
      // Reload stages to revert to correct order
      loadStages();
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("stages.title")}</h1>
            <p className="text-muted-foreground">{t("stages.manageStages")}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("stages.createStage")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStage ? t("stages.editStage") : t("stages.createNewStage")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("stages.stageName")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("stages.description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">{t("stages.color")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="active">{t("stages.active")}</Label>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                </div>

                {/* WIP Limit Configuration */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">{t("qrm.wipConfiguration", "WIP Limit Configuration")}</h3>

                  <div className="space-y-2">
                    <Label htmlFor="wip_limit">{t("qrm.wipLimit", "WIP Limit")}</Label>
                    <Input
                      id="wip_limit"
                      type="number"
                      min="1"
                      value={formData.wip_limit ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wip_limit: e.target.value ? parseInt(e.target.value) : null
                        })
                      }
                      placeholder={t("qrm.noLimit", "No limit")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("qrm.wipLimitHelp", "Maximum number of jobs allowed in this stage. Leave empty for no limit.")}
                    </p>
                  </div>

                  {formData.wip_limit !== null && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="wip_warning_threshold">{t("qrm.wipWarningThreshold", "Warning Threshold")}</Label>
                        <Input
                          id="wip_warning_threshold"
                          type="number"
                          min="1"
                          max={formData.wip_limit || undefined}
                          value={formData.wip_warning_threshold ?? ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              wip_warning_threshold: e.target.value ? parseInt(e.target.value) : null
                            })
                          }
                          placeholder="80% of limit"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("qrm.wipWarningHelp", "Show warning when WIP reaches this threshold.")}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enforce_wip_limit">{t("qrm.enforceLimit", "Enforce Limit")}</Label>
                          <p className="text-xs text-muted-foreground">
                            {t("qrm.enforceLimitHelp", "Prevent new jobs from entering when limit is reached")}
                          </p>
                        </div>
                        <Switch
                          id="enforce_wip_limit"
                          checked={formData.enforce_wip_limit}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, enforce_wip_limit: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="show_capacity_warning">{t("qrm.showCapacityWarning", "Show Capacity Warning")}</Label>
                          <p className="text-xs text-muted-foreground">
                            {t("qrm.showCapacityWarningHelp", "Display visual warnings when approaching limit")}
                          </p>
                        </div>
                        <Switch
                          id="show_capacity_warning"
                          checked={formData.show_capacity_warning}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, show_capacity_warning: checked })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  {editingStage ? t("stages.updateStage") : t("stages.createStage")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stages List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {stages.map((stage) => (
                <SortableStageCard
                  key={stage.id}
                  stage={stage}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  tenantId={profile?.tenant_id || ""}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("stages.deleteStage")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("stages.deleteStageConfirmation", { name: stageToDelete?.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

// Component to display WIP metrics for a stage
function StageWIPDisplay({ stageId, tenantId }: { stageId: string; tenantId: string }) {
  const { metrics, loading } = useCellQRMMetrics(stageId, tenantId);
  const { t } = useTranslation();

  if (loading || !metrics) {
    return (
      <div className="text-sm text-gray-500">
        {t("qrm.loadingMetrics", "Loading WIP metrics...")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("qrm.currentWIP", "Current WIP")}</span>
        <WIPIndicator metrics={metrics} compact />
      </div>
      {metrics.jobs_in_cell && metrics.jobs_in_cell.length > 0 && (
        <div className="text-xs text-gray-600">
          {t("qrm.jobsInCell", "Jobs")}: {metrics.jobs_in_cell.map((j) => j.job_number).join(", ")}
        </div>
      )}
    </div>
  );
}
