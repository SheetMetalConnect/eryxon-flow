import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  GripVertical,
  Plus,
  Trash2,
  ListChecks,
  Sparkles,
  PlayCircle,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { IconPicker, IconDisplay } from "@/components/ui/icon-picker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Substep {
  id: string;
  operation_id: string;
  name: string;
  icon_name?: string | null;
  sequence: number;
  status: string;
  notes?: string;
  completed_at?: string;
  completed_by?: string;
}

interface TemplateItem {
  id: string;
  name: string;
  notes?: string;
  sequence: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  operation_type: string | null;
  is_global: boolean;
  items?: TemplateItem[];
}

interface SubstepsManagerProps {
  operationId: string;
  operationName: string;
  onUpdate?: () => void;
}

interface SortableSubstepItemProps {
  substep: Substep;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

function SortableSubstepItem({ substep, onStatusChange, onDelete, onNotesChange }: SortableSubstepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: substep.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(substep.notes || "");

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    not_started: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "Not Started" },
    in_progress: { icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", label: "In Progress" },
    completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", label: "Completed" },
    blocked: { icon: Ban, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", label: "Blocked" },
  };

  const config = statusConfig[substep.status] || statusConfig.not_started;
  const StatusIcon = config.icon;

  const handleSaveNotes = () => {
    onNotesChange(substep.id, notesValue);
    setIsEditingNotes(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg} group`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mt-1"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {substep.icon_name && (
              <IconDisplay iconName={substep.icon_name} className="h-4 w-4 flex-shrink-0" />
            )}
            <button
              onClick={() => {
                const nextStatus = {
                  not_started: "in_progress",
                  in_progress: "completed",
                  completed: "not_started",
                  blocked: "not_started",
                }[substep.status] as string;
                onStatusChange(substep.id, nextStatus);
              }}
              className="flex-shrink-0"
            >
              <StatusIcon className={`h-5 w-5 ${config.color}`} />
            </button>
            <span className={`font-medium text-sm ${substep.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {substep.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Select value={substep.status} onValueChange={(value) => onStatusChange(substep.id, value)}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(substep.id)}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes..."
              className="text-xs"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotes}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            {substep.notes && (
              <p className="text-xs text-muted-foreground ml-7">{substep.notes}</p>
            )}
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-xs text-blue-600 hover:underline ml-7 mt-1"
            >
              {substep.notes ? "Edit notes" : "Add notes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubstepsManager({ operationId, operationName, onUpdate }: SubstepsManagerProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [substeps, setSubsteps] = useState<Substep[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSubstepName, setNewSubstepName] = useState("");
  const [newSubstepNotes, setNewSubstepNotes] = useState("");
  const [newSubstepIcon, setNewSubstepIcon] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSubsteps();
    loadTemplates();
  }, [operationId, profile?.tenant_id]);

  const loadSubsteps = async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("substeps")
        .select("*")
        .eq("operation_id", operationId)
        .eq("tenant_id", profile.tenant_id)
        .order("sequence", { ascending: true });

      if (error) throw error;
      setSubsteps(data || []);
    } catch (error: any) {
      console.error("Error loading substeps:", error);
      toast.error(t("substepToasts.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from("substep_templates")
        .select(`
          *,
          items:substep_template_items (
            id,
            name,
            notes,
            sequence
          )
        `)
        .or(`tenant_id.eq.${profile.tenant_id},is_global.eq.true`)
        .order('name', { ascending: true })
        .order('sequence', { foreignTable: 'substep_template_items', ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      // Don't show error toast, templates are optional
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = substeps.findIndex((s) => s.id === active.id);
    const newIndex = substeps.findIndex((s) => s.id === over.id);

    const newSubsteps = arrayMove(substeps, oldIndex, newIndex);

    // Update sequences
    const updatedSubsteps = newSubsteps.map((s, index) => ({
      ...s,
      sequence: index + 1,
    }));

    setSubsteps(updatedSubsteps);

    // Update in database
    try {
      const updates = updatedSubsteps.map((s) =>
        supabase
          .from("substeps")
          .update({ sequence: s.sequence })
          .eq("id", s.id)
      );

      await Promise.all(updates);
      toast.success(t("substepToasts.reordered"));
      onUpdate?.();
    } catch (error: any) {
      console.error("Error reordering substeps:", error);
      toast.error(t("substepToasts.reorderFailed"));
      loadSubsteps(); // Reload to restore correct order
    }
  };

  const handleAddSubstep = async () => {
    if (!newSubstepName.trim() || !profile?.tenant_id) return;

    setLoading(true);
    try {
      const maxSequence = substeps.length > 0 ? Math.max(...substeps.map((s) => s.sequence)) : 0;

      const { data, error } = await supabase
        .from("substeps")
        .insert({
          operation_id: operationId,
          tenant_id: profile.tenant_id,
          name: newSubstepName.trim(),
          notes: newSubstepNotes.trim() || null,
          icon_name: newSubstepIcon || null,
          sequence: maxSequence + 1,
          status: "not_started",
        })
        .select()
        .single();

      if (error) throw error;

      setSubsteps([...substeps, data]);
      setNewSubstepName("");
      setNewSubstepNotes("");
      setNewSubstepIcon("");
      toast.success(t("substepToasts.added"));
      onUpdate?.();
    } catch (error: any) {
      console.error("Error adding substep:", error);
      toast.error(t("substepToasts.addFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!profile?.id) return;

    const updatedSubsteps = substeps.map((s) =>
      s.id === id
        ? {
            ...s,
            status: status as Substep["status"],
            completed_at: status === "completed" ? new Date().toISOString() : null,
            completed_by: status === "completed" ? profile.id : null,
          }
        : s
    );

    setSubsteps(updatedSubsteps);

    try {
      const update: any = { status };
      if (status === "completed") {
        update.completed_at = new Date().toISOString();
        update.completed_by = profile.id;
      } else {
        update.completed_at = null;
        update.completed_by = null;
      }

      const { error } = await supabase
        .from("substeps")
        .update(update)
        .eq("id", id);

      if (error) throw error;
      toast.success(t("substepToasts.statusUpdated"));
      onUpdate?.();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(t("substepToasts.statusUpdateFailed"));
      loadSubsteps();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("substeps")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSubsteps(substeps.filter((s) => s.id !== id));
      toast.success(t("substepToasts.deleted"));
      onUpdate?.();
    } catch (error: any) {
      console.error("Error deleting substep:", error);
      toast.error(t("substepToasts.deleteFailed"));
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    const updatedSubsteps = substeps.map((s) =>
      s.id === id ? { ...s, notes } : s
    );

    setSubsteps(updatedSubsteps);

    try {
      const { error } = await supabase
        .from("substeps")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
      toast.success(t("substepToasts.notesUpdated"));
      onUpdate?.();
    } catch (error: any) {
      console.error("Error updating notes:", error);
      toast.error(t("substepToasts.notesUpdateFailed"));
      loadSubsteps();
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !profile?.tenant_id) return;

    setLoading(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template || !template.items || template.items.length === 0) {
        toast.error(t("substepToasts.templateNotFound"));
        return;
      }

      const maxSequence = substeps.length > 0 ? Math.max(...substeps.map((s) => s.sequence)) : 0;

      const newSubsteps = template.items.map((item, index) => ({
        operation_id: operationId,
        tenant_id: profile.tenant_id!,
        name: item.name,
        notes: item.notes || null,
        sequence: maxSequence + index + 1,
        status: "not_started" as const,
      }));

      const { data, error } = await supabase
        .from("substeps")
        .insert(newSubsteps)
        .select();

      if (error) throw error;

      setSubsteps([...substeps, ...(data || [])]);
      setShowTemplateDialog(false);
      setSelectedTemplate("");
      toast.success(t("notifications.success"));
      onUpdate?.();
    } catch (error: any) {
      console.error("Error applying template:", error);
      toast.error(t("substepToasts.templateApplyFailed"));
    } finally {
      setLoading(false);
    }
  };

  const completedCount = substeps.filter((s) => s.status === "completed").length;
  const totalCount = substeps.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          <h3 className="font-semibold">Substeps</h3>
          {totalCount > 0 && (
            <Badge variant="secondary">
              {completedCount}/{totalCount}
            </Badge>
          )}
        </div>
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Use Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Substep Template</DialogTitle>
              <DialogDescription>
                Choose a template to quickly add standard substeps for common metalworking operations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.items?.length || 0} steps)
                      {template.is_global && " ⭐"}
                    </SelectItem>
                  ))}
                  {templates.length === 0 && (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedTemplate && templates.find(t => t.id === selectedTemplate) && (
                <div className="text-sm">
                  <div className="font-medium mb-2">Preview:</div>
                  {templates.find(t => t.id === selectedTemplate)?.description && (
                    <p className="text-muted-foreground mb-2 text-xs">
                      {templates.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  )}
                  <ul className="space-y-1 text-muted-foreground">
                    {templates.find(t => t.id === selectedTemplate)?.items?.slice(0, 3).map((item, index) => (
                      <li key={item.id || index} className="flex items-center gap-2">
                        <Circle className="h-3 w-3" />
                        {item.name}
                      </li>
                    ))}
                    {(templates.find(t => t.id === selectedTemplate)?.items?.length || 0) > 3 && (
                      <li className="text-xs">... and {(templates.find(t => t.id === selectedTemplate)?.items?.length || 0) - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleApplyTemplate} disabled={!selectedTemplate || loading}>
                  Apply Template
                </Button>
                <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        {substeps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No substeps yet. Add substeps to break down this operation.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={substeps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {substeps.map((substep) => (
                <SortableSubstepItem
                  key={substep.id}
                  substep={substep}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onNotesChange={handleNotesChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <Input
          placeholder="New substep name..."
          value={newSubstepName}
          onChange={(e) => setNewSubstepName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddSubstep()}
        />
        <IconPicker
          value={newSubstepIcon}
          onValueChange={setNewSubstepIcon}
          placeholder="Select icon (optional)..."
        />
        <Textarea
          placeholder="Optional notes..."
          value={newSubstepNotes}
          onChange={(e) => setNewSubstepNotes(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button
          onClick={handleAddSubstep}
          disabled={!newSubstepName.trim() || loading}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Substep
        </Button>
      </div>
    </div>
  );
}
