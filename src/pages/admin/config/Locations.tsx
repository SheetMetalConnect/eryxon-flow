import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorageLocations } from "@/hooks/locations/useStorageLocations";
import {
  useStorageLocationMutations,
  type StorageLocationInput,
} from "@/hooks/locations/useStorageLocationMutations";

const NO_CELL = "__none__";

interface EditorState extends StorageLocationInput {
  id?: string;
}

const emptyEditor: EditorState = {
  code: "",
  label: "",
  cell_id: null,
  capacity: 1,
  row_index: null,
  col_index: null,
  sort_order: 0,
  active: true,
};

export default function ConfigLocations() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { occupancy, isLoading } = useStorageLocations();
  const { create, update, remove, isSaving, isDeleting } =
    useStorageLocationMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);

  const { data: cells = [] } = useQuery({
    queryKey: ["locations", "cells", profile?.tenant_id ?? ""],
    queryFn: async () => {
      if (!profile?.tenant_id) return [] as { id: string; name: string }[];
      const { data, error } = await supabase
        .from("cells")
        .select("id, name")
        .eq("tenant_id", profile.tenant_id)
        .order("sequence");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!profile?.tenant_id,
  });

  const cellNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const cell of cells) map.set(cell.id, cell.name);
    return map;
  }, [cells]);

  const totals = useMemo(() => {
    const slots = occupancy.length;
    const capacity = occupancy.reduce((sum, o) => sum + o.location.capacity, 0);
    const occupied = occupancy.reduce((sum, o) => sum + o.occupied, 0);
    return { slots, capacity, occupied };
  }, [occupancy]);

  const openCreate = () => {
    setEditor({ ...emptyEditor, sort_order: occupancy.length });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const target = occupancy.find((o) => o.location.id === id);
    if (!target) return;
    setEditor({
      id: target.location.id,
      code: target.location.code,
      label: target.location.label ?? "",
      cell_id: target.location.cell_id ?? null,
      capacity: target.location.capacity,
      sort_order: target.location.sort_order ?? 0,
      active: target.location.active ?? true,
      row_index: null,
      col_index: null,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const input: StorageLocationInput = {
      code: editor.code.trim(),
      label: editor.label?.trim() || null,
      cell_id: editor.cell_id ?? null,
      capacity: Number(editor.capacity) || 1,
      row_index: editor.row_index ?? null,
      col_index: editor.col_index ?? null,
      sort_order: Number(editor.sort_order) || 0,
      active: editor.active ?? true,
    };
    if (editor.id) {
      update(
        { id: editor.id, input },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      create(input, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (id: string, code: string) => {
    if (window.confirm(t("locations.config.deleteConfirm", { code }))) {
      remove(id);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          {t("locations.config.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("locations.config.description")}
        </p>
      </div>

      <hr className="title-divider" />

      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totals.slots}</div>
            <div className="text-xs text-muted-foreground">
              {t("locations.config.totalSlots")}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totals.occupied}</div>
            <div className="text-xs text-muted-foreground">
              {t("locations.config.totalOccupied")}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totals.capacity}</div>
            <div className="text-xs text-muted-foreground">
              {t("locations.config.totalCapacity")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("locations.config.addSlot")}
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("locations.config.code")}</TableHead>
                <TableHead>{t("locations.config.label")}</TableHead>
                <TableHead>{t("locations.config.cell")}</TableHead>
                <TableHead className="text-center">
                  {t("locations.config.occupancy")}
                </TableHead>
                <TableHead className="text-center">
                  {t("locations.config.status")}
                </TableHead>
                <TableHead className="text-right">
                  {t("locations.config.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t("locations.config.loading")}
                  </TableCell>
                </TableRow>
              ) : occupancy.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    {t("locations.config.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                occupancy.map((slot) => (
                  <TableRow key={slot.location.id}>
                    <TableCell className="font-mono font-medium">
                      {slot.location.code}
                    </TableCell>
                    <TableCell>{slot.location.label || "—"}</TableCell>
                    <TableCell>
                      {slot.location.cell_id
                        ? cellNameById.get(slot.location.cell_id) ||
                          t("locations.config.unknownCell")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "font-medium",
                          slot.isFull && "text-destructive",
                        )}
                      >
                        {slot.occupied}/{slot.location.capacity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={slot.location.active ? "default" : "secondary"}
                      >
                        {slot.location.active
                          ? t("locations.config.active")
                          : t("locations.config.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(slot.location.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() =>
                            handleDelete(slot.location.id, slot.location.code)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>
              {editor.id
                ? t("locations.config.editSlot")
                : t("locations.config.addSlot")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loc-code">{t("locations.config.code")} *</Label>
                <Input
                  id="loc-code"
                  value={editor.code}
                  onChange={(e) =>
                    setEditor({ ...editor, code: e.target.value })
                  }
                  placeholder={t("locations.config.codePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-capacity">
                  {t("locations.config.capacity")} *
                </Label>
                <Input
                  id="loc-capacity"
                  type="number"
                  min={1}
                  value={editor.capacity}
                  onChange={(e) =>
                    setEditor({ ...editor, capacity: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-label">{t("locations.config.label")}</Label>
              <Input
                id="loc-label"
                value={editor.label ?? ""}
                onChange={(e) =>
                  setEditor({ ...editor, label: e.target.value })
                }
                placeholder={t("locations.config.labelPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("locations.config.cell")}</Label>
              <Select
                value={editor.cell_id ?? NO_CELL}
                onValueChange={(value) =>
                  setEditor({
                    ...editor,
                    cell_id: value === NO_CELL ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CELL}>
                    {t("locations.config.noCell")}
                  </SelectItem>
                  {cells.map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loc-row">{t("locations.config.row")}</Label>
                <Input
                  id="loc-row"
                  type="number"
                  value={editor.row_index ?? ""}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      row_index:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-col">{t("locations.config.col")}</Label>
                <Input
                  id="loc-col"
                  type="number"
                  value={editor.col_index ?? ""}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      col_index:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-sort">
                  {t("locations.config.sortOrder")}
                </Label>
                <Input
                  id="loc-sort"
                  type="number"
                  value={editor.sort_order ?? 0}
                  onChange={(e) =>
                    setEditor({ ...editor, sort_order: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="loc-active"
                checked={editor.active ?? true}
                onCheckedChange={(checked) =>
                  setEditor({ ...editor, active: checked })
                }
              />
              <Label htmlFor="loc-active">{t("locations.config.active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("locations.config.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !editor.code.trim()}
            >
              {t("locations.config.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
