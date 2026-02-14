import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateItem {
  id?: string;
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
  created_at: string;
  updated_at: string;
}

interface SortableItemProps {
  item: TemplateItem;
  index: number;
  onEdit: (index: number, field: 'name' | 'notes', value: string) => void;
  onDelete: (index: number) => void;
}

function SortableItem({ item, index, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.sequence });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mt-2"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-2">
        <Input
          value={item.name}
          onChange={(e) => onEdit(index, 'name', e.target.value)}
          placeholder="Step name"
          className="font-medium"
        />
        <Textarea
          value={item.notes || ''}
          onChange={(e) => onEdit(index, 'notes', e.target.value)}
          placeholder="Optional notes"
          rows={2}
          className="text-sm"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        className="mt-2"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TemplatesManager() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    operation_type: "",
  });
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadTemplates();
  }, [profile?.tenant_id]);

  const loadTemplates = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

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

    if (error) {
      console.error("Error loading templates:", error);
      toast.error(t("Failed to load templates"));
    } else {
      setTemplates(data || []);
    }

    setLoading(false);
  };

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || "",
        operation_type: template.operation_type || "",
      });
      setTemplateItems(template.items || []);
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        operation_type: "",
      });
      setTemplateItems([
        { name: "", notes: "", sequence: 1 }
      ]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: "", description: "", operation_type: "" });
    setTemplateItems([]);
  };

  const handleAddItem = () => {
    setTemplateItems([
      ...templateItems,
      { name: "", notes: "", sequence: templateItems.length + 1 }
    ]);
  };

  const handleEditItem = (index: number, field: 'name' | 'notes', value: string) => {
    const updated = [...templateItems];
    updated[index][field] = value;
    setTemplateItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    const updated = templateItems.filter((_, i) => i !== index);
    // Resequence
    const resequenced = updated.map((item, i) => ({
      ...item,
      sequence: i + 1
    }));
    setTemplateItems(resequenced);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTemplateItems((items) => {
        const oldIndex = items.findIndex(item => item.sequence === active.id);
        const newIndex = items.findIndex(item => item.sequence === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        // Resequence
        return reordered.map((item, i) => ({
          ...item,
          sequence: i + 1
        }));
      });
    }
  };

  const handleSubmit = async () => {
    if (!profile?.tenant_id) return;

    if (!formData.name.trim()) {
      toast.error(t("Template name is required"));
      return;
    }

    if (templateItems.length === 0 || templateItems.some(item => !item.name.trim())) {
      toast.error(t("All template items must have a name"));
      return;
    }

    try {
      if (editingTemplate) {
        // Update template
        const { error: templateError } = await supabase
          .from("substep_templates")
          .update({
            name: formData.name,
            description: formData.description || null,
            operation_type: formData.operation_type || null,
          })
          .eq('id', editingTemplate.id);

        if (templateError) throw templateError;

        // Delete old items
        await supabase
          .from("substep_template_items")
          .delete()
          .eq('template_id', editingTemplate.id);

        // Insert new items
        const { error: itemsError } = await supabase
          .from("substep_template_items")
          .insert(
            templateItems.map(item => ({
              template_id: editingTemplate.id,
              name: item.name,
              notes: item.notes || null,
              sequence: item.sequence,
            }))
          );

        if (itemsError) throw itemsError;

        toast.success(t("Template updated successfully"));
      } else {
        // Create new template
        const { data: template, error: templateError } = await supabase
          .from("substep_templates")
          .insert({
            tenant_id: profile.tenant_id,
            name: formData.name,
            description: formData.description || null,
            operation_type: formData.operation_type || null,
            is_global: false,
          })
          .select()
          .single();

        if (templateError || !template) throw templateError;

        // Insert items
        const { error: itemsError } = await supabase
          .from("substep_template_items")
          .insert(
            templateItems.map(item => ({
              template_id: template.id,
              name: item.name,
              notes: item.notes || null,
              sequence: item.sequence,
            }))
          );

        if (itemsError) throw itemsError;

        toast.success(t("Template created successfully"));
      }

      handleCloseDialog();
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(t("Failed to save template"));
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(t("Are you sure you want to delete this template?"))) return;

    if (template.is_global) {
      toast.error(t("Cannot delete global templates"));
      return;
    }

    const { error } = await supabase
      .from("substep_templates")
      .delete()
      .eq('id', template.id);

    if (error) {
      console.error("Error deleting template:", error);
      toast.error(t("Failed to delete template"));
    } else {
      toast.success(t("Template deleted successfully"));
      loadTemplates();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const operationTypes = [
    { value: "cutting", label: "Cutting" },
    { value: "bending", label: "Bending" },
    { value: "welding", label: "Welding" },
    { value: "machining", label: "Machining" },
    { value: "finishing", label: "Finishing" },
    { value: "assembly", label: "Assembly" },
    { value: "inspection", label: "Inspection" },
    { value: "packaging", label: "Packaging" },
    { value: "general", label: "General" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {templates.length} {t("Templates")}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t("New Template")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>
                {editingTemplate ? t("Edit Template") : t("New Template")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("Template Name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("e.g., Standard Cutting Workflow")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("Description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("Optional description of this template")}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation_type">{t("Operation Type")}</Label>
                <Select
                  value={formData.operation_type}
                  onValueChange={(value) => setFormData({ ...formData, operation_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select operation type (optional)")} />
                  </SelectTrigger>
                  <SelectContent>
                    {operationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{t("Template Steps")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("Add Step")}
                  </Button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={templateItems.map(item => item.sequence)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {templateItems.map((item, index) => (
                        <SortableItem
                          key={item.sequence}
                          item={item}
                          index={index}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {templateItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("No steps added yet. Click 'Add Step' to get started.")}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleSubmit}>
                {editingTemplate ? t("Update") : t("Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  {template.is_global && (
                    <Badge variant="secondary">Global</Badge>
                  )}
                  {template.operation_type && (
                    <Badge variant="outline">{template.operation_type}</Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                )}
                <div className="space-y-1">
                  {template.items?.slice(0, 3).map((item, idx) => (
                    <div key={item.id || idx} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                  {template.items && template.items.length > 3 && (
                    <div className="text-sm text-muted-foreground pl-5">
                      +{template.items.length - 3} more steps
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(template)}
                  disabled={template.is_global}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(template)}
                  disabled={template.is_global}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t("No templates created yet. Click 'New Template' to get started.")}
          </div>
        )}
      </div>
    </div>
  );
}
