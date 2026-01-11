import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, X } from "lucide-react";

interface CreateOperationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOperationModal({ onClose, onSuccess }: CreateOperationModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedJobId, setSelectedJobId] = useState("");
  const [formData, setFormData] = useState({
    part_id: "",
    operation_name: "",
    cell_id: "",
    estimated_time: 0,
    sequence: 1,
    notes: "",
  });

  // Fetch jobs for selection
  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-operation-creation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number, customer")
        .neq("status", "completed")
        .order("job_number");

      if (error) throw error;
      return data;
    },
  });

  // Fetch parts for selected job
  const { data: parts } = useQuery({
    queryKey: ["parts-for-operation-creation", selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];

      const { data, error } = await supabase
        .from("parts")
        .select("id, part_number, material")
        .eq("job_id", selectedJobId)
        .neq("status", "completed")
        .order("part_number");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedJobId,
  });

  // Fetch cells
  const { data: cells } = useQuery({
    queryKey: ["cells-for-operation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("*")
        .eq("active", true)
        .order("sequence");

      if (error) throw error;
      return data;
    },
  });

  // Get next sequence number for selected part
  const { data: nextSequence } = useQuery({
    queryKey: ["next-operation-sequence", formData.part_id],
    queryFn: async () => {
      if (!formData.part_id) return 1;

      const { data, error } = await supabase
        .from("operations")
        .select("sequence")
        .eq("part_id", formData.part_id)
        .order("sequence", { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0]?.sequence || 0) + 1;
    },
    enabled: !!formData.part_id,
  });

  // Update sequence when part changes
  const handlePartChange = (partId: string) => {
    setFormData({ ...formData, part_id: partId });
  };

  const createOperationMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant ID");

      const { data, error } = await supabase
        .from("operations")
        .insert({
          tenant_id: profile.tenant_id,
          part_id: formData.part_id,
          operation_name: formData.operation_name,
          cell_id: formData.cell_id,
          estimated_time: formData.estimated_time || null,
          sequence: formData.sequence || nextSequence || 1,
          notes: formData.notes || null,
          status: "not_started",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: t("operations.createSuccess"),
        description: t("operations.createSuccessDesc", { operationName: data.operation_name }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.part_id || !formData.operation_name || !formData.cell_id) {
      toast({
        title: t("common.validationError"),
        description: t("operations.requiredFieldsMissing"),
        variant: "destructive",
      });
      return;
    }
    createOperationMutation.mutate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("operations.createOperation")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Selection */}
          <div>
            <Label>{t("operations.selectJob")} *</Label>
            <Select
              value={selectedJobId}
              onValueChange={(value) => {
                setSelectedJobId(value);
                setFormData({ ...formData, part_id: "" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("operations.selectJobPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_number} - {job.customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Part Selection */}
          <div>
            <Label>{t("operations.selectPart")} *</Label>
            <Select
              value={formData.part_id}
              onValueChange={handlePartChange}
              disabled={!selectedJobId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedJobId ? t("operations.selectPartPlaceholder") : t("operations.selectJobFirst")} />
              </SelectTrigger>
              <SelectContent>
                {parts?.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.part_number} ({part.material})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operation Name */}
          <div>
            <Label>{t("operations.operationName")} *</Label>
            <Input
              value={formData.operation_name}
              onChange={(e) => setFormData({ ...formData, operation_name: e.target.value })}
              placeholder={t("operations.operationNamePlaceholder")}
            />
          </div>

          {/* Cell Selection */}
          <div>
            <Label>{t("operations.cell")} *</Label>
            <Select
              value={formData.cell_id}
              onValueChange={(value) => setFormData({ ...formData, cell_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("operations.selectCell")} />
              </SelectTrigger>
              <SelectContent>
                {cells?.map((cell) => (
                  <SelectItem key={cell.id} value={cell.id}>
                    {cell.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Time */}
            <div>
              <Label>{t("operations.estimatedTimeMinutes")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.estimated_time || ""}
                onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Sequence */}
            <div>
              <Label>{t("operations.sequence")}</Label>
              <Input
                type="number"
                min={1}
                value={formData.sequence || nextSequence || 1}
                onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>{t("operations.notes")}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder={t("operations.notesPlaceholder")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={createOperationMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createOperationMutation.isPending ? t("operations.creating") : t("operations.createOperation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
