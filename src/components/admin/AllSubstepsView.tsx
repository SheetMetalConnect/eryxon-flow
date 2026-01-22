import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Edit, Trash2, Loader2, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

interface Substep {
  id: string;
  operation_id: string;
  name: string;
  notes: string | null;
  status: string;
  sequence: number;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  operation?: {
    id: string;
    operation_name: string;
    part?: {
      id: string;
      part_number: string;
      job?: {
        id: string;
        job_number: string;
      };
    };
  };
}

export function AllSubstepsView() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [substeps, setSubsteps] = useState<Substep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubstep, setEditingSubstep] = useState<Substep | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    notes: "",
    status: "not_started",
  });

  const loadSubsteps = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("substeps")
      .select(`
        *,
        operations!inner (
          id,
          operation_name,
          parts!inner (
            id,
            part_number,
            jobs!inner (
              id,
              job_number
            )
          )
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading substeps:", error);
      toast.error(t("Failed to load substeps"));
    } else {
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        operation: {
          id: item.operations.id,
          operation_name: item.operations.operation_name,
          part: {
            id: item.operations.parts.id,
            part_number: item.operations.parts.part_number,
            job: {
              id: item.operations.parts.jobs.id,
              job_number: item.operations.parts.jobs.job_number,
            },
          },
        },
      }));
      setSubsteps(transformedData);
    }

    setLoading(false);
  };

  const filteredSubsteps = useMemo(() => {
    let filtered = [...substeps];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (substep) =>
          substep.name.toLowerCase().includes(term) ||
          substep.notes?.toLowerCase().includes(term) ||
          substep.operation?.operation_name.toLowerCase().includes(term) ||
          substep.operation?.part?.part_number.toLowerCase().includes(term) ||
          substep.operation?.part?.job?.job_number.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((substep) => substep.status === statusFilter);
    }

    return filtered;
  }, [searchTerm, statusFilter, substeps]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const loadTimeout = window.setTimeout(() => {
      void loadSubsteps();
    }, 0);
    return () => clearTimeout(loadTimeout);
  }, [profile?.tenant_id]);

  const handleOpenEditDialog = (substep: Substep) => {
    setEditingSubstep(substep);
    setFormData({
      name: substep.name,
      notes: substep.notes || "",
      status: substep.status,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSubstep(null);
    setFormData({ name: "", notes: "", status: "not_started" });
  };

  const handleUpdate = async () => {
    if (!editingSubstep) return;

    if (!formData.name.trim()) {
      toast.error(t("Substep name is required"));
      return;
    }

    const { error } = await supabase
      .from("substeps")
      .update({
        name: formData.name,
        notes: formData.notes || null,
        status: formData.status,
        completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
        completed_by: formData.status === 'completed' ? profile?.id : null,
      })
      .eq('id', editingSubstep.id);

    if (error) {
      console.error("Error updating substep:", error);
      toast.error(t("Failed to update substep"));
    } else {
      toast.success(t("Substep updated successfully"));
      handleCloseEditDialog();
      loadSubsteps();
    }
  };

  const handleDelete = async (substep: Substep) => {
    if (!confirm(t("Are you sure you want to delete this substep?"))) return;

    const { error } = await supabase
      .from("substeps")
      .delete()
      .eq('id', substep.id);

    if (error) {
      console.error("Error deleting substep:", error);
      toast.error(t("Failed to delete substep"));
    } else {
      toast.success(t("Substep deleted successfully"));
      loadSubsteps();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-alert-success-bg text-success border-alert-success-border';
      case 'in_progress':
        return 'bg-alert-info-bg text-brand-primary border-alert-info-border';
      case 'blocked':
        return 'bg-alert-error-bg text-destructive border-alert-error-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('Completed');
      case 'in_progress':
        return t('In Progress');
      case 'blocked':
        return t('Blocked');
      default:
        return t('Not Started');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">{t("Search")}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("Search by job, part, operation, or step name...")}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-48 space-y-2">
          <Label htmlFor="status-filter">{t("Status")}</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Statuses")}</SelectItem>
              <SelectItem value="not_started">{t("Not Started")}</SelectItem>
              <SelectItem value="in_progress">{t("In Progress")}</SelectItem>
              <SelectItem value="completed">{t("Completed")}</SelectItem>
              <SelectItem value="blocked">{t("Blocked")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {t("Showing")} {filteredSubsteps.length} {t("of")} {substeps.length} {t("substeps")}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Job")}</TableHead>
              <TableHead>{t("Part")}</TableHead>
              <TableHead>{t("Operation")}</TableHead>
              <TableHead>{t("Step Name")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Seq")}</TableHead>
              <TableHead className="w-[100px]">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubsteps.map((substep) => (
              <TableRow key={substep.id}>
                <TableCell className="font-medium">
                  {substep.operation?.part?.job?.job_number || '-'}
                </TableCell>
                <TableCell>
                  {substep.operation?.part?.part_number || '-'}
                </TableCell>
                <TableCell>
                  {substep.operation?.operation_name || '-'}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{substep.name}</div>
                    {substep.notes && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {substep.notes}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(substep.status)}>
                    {getStatusLabel(substep.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {substep.sequence}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditDialog(substep)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(substep)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredSubsteps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm || statusFilter !== 'all'
              ? t("No substeps match your filters")
              : t("No substeps created yet")}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Edit Substep")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("Step Name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("Step name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">{t("Notes")}</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("Optional notes")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">{t("Status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">{t("Not Started")}</SelectItem>
                  <SelectItem value="in_progress">{t("In Progress")}</SelectItem>
                  <SelectItem value="completed">{t("Completed")}</SelectItem>
                  <SelectItem value="blocked">{t("Blocked")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleUpdate}>
              {t("Update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
