import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Trash2, GripVertical, Infinity, CheckCircle, AlertTriangle, Factory, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCellQRMMetrics } from "@/hooks/useQRMMetrics";
import { WIPIndicator, WIPBar } from "@/components/qrm/WIPIndicator";
import { IconPicker, IconDisplay } from "@/components/ui/icon-picker";

// Default colors using design system tokens
const DEFAULT_STAGE_COLOR = "hsl(var(--neutral-600))"; // Fallback gray
const DEFAULT_NEW_STAGE_COLOR = "hsl(var(--brand-primary))"; // Primary blue for new stages

interface Stage {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon_name: string | null;
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
      <Card className="hover:shadow-md transition-shadow duration-200 overflow-hidden">
        {/* Color accent bar */}
        <div
          className="h-1 w-full"
          style={{ backgroundColor: stage.color || DEFAULT_STAGE_COLOR }}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Drag handle */}
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-muted transition-colors mt-0.5"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Icon */}
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: stage.color || DEFAULT_STAGE_COLOR }}
              >
                <IconDisplay
                  iconName={stage.icon_name}
                  className="h-6 w-6 text-white"
                  fallback={<Factory className="h-6 w-6 text-white" />}
                />
              </div>

              {/* Title and status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg truncate">{stage.name}</CardTitle>
                  {!stage.active && (
                    <Badge variant="secondary" className="text-xs">
                      {t("stages.inactive")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">#{stage.sequence}</span>
                  </span>
                  {stage.wip_limit !== null ? (
                    <span className="flex items-center gap-1">
                      <Settings2 className="h-3.5 w-3.5" />
                      {t("qrm.wipLimit", "WIP Limit")}: {stage.wip_limit}
                      {stage.enforce_wip_limit && (
                        <span className="text-xs text-orange-600 font-medium">(enforced)</span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground/70">
                      <Infinity className="h-3.5 w-3.5" />
                      {t("qrm.noLimit", "No WIP Limit")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(stage)}
                className="h-8 w-8 p-0 hover:bg-primary/10"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(stage)}
                className="h-8 w-8 p-0 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content section */}
        {(stage.description || stage.wip_limit !== null) && (
          <CardContent className="pt-0 space-y-3">
            {stage.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stage.description}
              </p>
            )}
            <StageWIPDisplay stageId={stage.id} tenantId={tenantId} wipLimit={stage.wip_limit} />
          </CardContent>
        )}
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
    color: "DEFAULT_NEW_STAGE_COLOR",
    icon_name: "" as string,
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
            icon_name: formData.icon_name || null,
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
          icon_name: formData.icon_name || null,
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
      color: "DEFAULT_NEW_STAGE_COLOR",
      icon_name: "",
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
      color: stage.color || "DEFAULT_NEW_STAGE_COLOR",
      icon_name: stage.icon_name || "",
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{t("stages.title")}</h1>
              {stages.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {stages.length} {stages.length === 1 ? t("common.stage", "stage") : t("common.stages", "stages")}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {t("stages.manageStages")}
              {stages.length > 1 && (
                <span className="text-xs ml-2">
                  ({t("stages.dragToReorder", "Drag to reorder")})
                </span>
              )}
            </p>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("stages.stageName")} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t("stages.stageNamePlaceholder", "e.g., Cutting, Welding, Assembly")}
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
                      placeholder={t("stages.descriptionPlaceholder", "Describe what happens at this stage...")}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icon">{t("stages.icon", "Icon")}</Label>
                      <IconPicker
                        value={formData.icon_name}
                        onValueChange={(icon) =>
                          setFormData({ ...formData, icon_name: icon })
                        }
                        placeholder={t("stages.selectIcon", "Select...")}
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
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          placeholder="DEFAULT_NEW_STAGE_COLOR"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="active" className="font-medium">{t("stages.active")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("stages.activeHelp", "Inactive stages are hidden from operators")}
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, active: checked })
                      }
                    />
                  </div>
                </div>

                {/* QRM Settings */}
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{t("qrm.settings", "Capacity Settings")}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wip_limit">{t("qrm.wipLimit", "WIP Limit")}</Label>
                      <Input
                        id="wip_limit"
                        type="number"
                        min="0"
                        value={formData.wip_limit ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            wip_limit: e.target.value ? parseInt(e.target.value) : null
                          })
                        }
                        placeholder={t("qrm.unlimited", "No limit")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wip_warning_threshold">
                        {t("qrm.wipWarningThreshold", "Warning At")}
                      </Label>
                      <Input
                        id="wip_warning_threshold"
                        type="number"
                        min="0"
                        value={formData.wip_warning_threshold ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            wip_warning_threshold: e.target.value ? parseInt(e.target.value) : null
                          })
                        }
                        placeholder={formData.wip_limit ? `${Math.floor(formData.wip_limit * 0.8)}` : "—"}
                        disabled={!formData.wip_limit}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("qrm.wipLimitHelp", "Set capacity limits to prevent overloading this stage. Leave empty for unlimited.")}
                  </p>

                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="enforce_wip_limit" className="text-sm">
                          {t("qrm.enforceLimit", "Enforce Limit")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t("qrm.enforceLimitHelp", "Block new work at capacity")}
                        </p>
                      </div>
                      <Switch
                        id="enforce_wip_limit"
                        checked={formData.enforce_wip_limit}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, enforce_wip_limit: checked })
                        }
                        disabled={!formData.wip_limit}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show_capacity_warning" className="text-sm">
                          {t("qrm.showWarnings", "Visual Warnings")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t("qrm.showWarningsHelp", "Show capacity indicators")}
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
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingStage ? t("stages.updateStage") : t("stages.createStage")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stages List */}
        {stages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Factory className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t("stages.noStages", "No stages configured")}
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {t(
                  "stages.noStagesDescription",
                  "Stages represent different steps in your manufacturing process. Create your first stage to start organizing your workflow."
                )}
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("stages.createFirstStage", "Create your first stage")}
              </Button>
            </CardContent>
          </Card>
        ) : (
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
        )}

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
  );
}

// Component to display WIP metrics for a stage
function StageWIPDisplay({
  stageId,
  tenantId,
  wipLimit
}: {
  stageId: string;
  tenantId: string;
  wipLimit: number | null;
}) {
  const { metrics, loading } = useCellQRMMetrics(stageId, tenantId);
  const { t } = useTranslation();

  // Show visual bar for stages with WIP limits
  if (wipLimit !== null) {
    if (loading) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>WIP</span>
            <span>/ {wipLimit}</span>
          </div>
          <div className="h-2 bg-muted rounded-full animate-pulse" />
        </div>
      );
    }

    if (!metrics) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>WIP: 0</span>
            <span>Limit: {wipLimit}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-2 bg-green-600 w-0" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <WIPBar
          current={metrics.current_wip}
          limit={wipLimit}
          warningThreshold={metrics.wip_warning_threshold}
          height="sm"
        />
        {metrics.jobs_in_cell && metrics.jobs_in_cell.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {t("qrm.jobsInCell", "Jobs")}: {metrics.jobs_in_cell.map((j) => j.job_number).join(", ")}
          </div>
        )}
      </div>
    );
  }

  // No WIP limit set - don't display anything
  return null;
}
