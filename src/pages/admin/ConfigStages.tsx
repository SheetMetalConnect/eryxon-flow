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
import { Plus, Edit, Loader2, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sequence: number;
  active: boolean;
}

interface SortableStageCardProps {
  stage: Stage;
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
  t: any;
}

function SortableStageCard({ stage, onEdit, onDelete, t }: SortableStageCardProps) {
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
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{t("stages.sequence")}: {stage.sequence}</Badge>
                  <Badge variant={stage.active ? "default" : "secondary"}>
                    {stage.active ? t("stages.active") : t("stages.inactive")}
                  </Badge>
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
        {stage.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{stage.description}</p>
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
    color: "#3b82f6",
    active: true,
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
        await supabase
          .from("cells")
          .update({ sequence: update.sequence })
          .eq("id", update.id);
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
