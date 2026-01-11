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

interface CreatePartModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePartModal({ onClose, onSuccess }: CreatePartModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    job_id: "",
    part_number: "",
    material: "",
    quantity: 1,
    parent_part_id: "",
    notes: "",
  });

  // Fetch jobs for selection
  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-part-creation"],
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

  // Fetch parts for parent selection (only from selected job)
  const { data: existingParts } = useQuery({
    queryKey: ["parts-for-parent-selection", formData.job_id],
    queryFn: async () => {
      if (!formData.job_id) return [];

      const { data, error } = await supabase
        .from("parts")
        .select("id, part_number")
        .eq("job_id", formData.job_id)
        .order("part_number");

      if (error) throw error;
      return data;
    },
    enabled: !!formData.job_id,
  });

  const createPartMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant ID");

      const { data, error } = await supabase
        .from("parts")
        .insert({
          tenant_id: profile.tenant_id,
          job_id: formData.job_id,
          part_number: formData.part_number,
          material: formData.material,
          quantity: formData.quantity,
          parent_part_id: formData.parent_part_id || null,
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
        title: t("parts.createSuccess"),
        description: t("parts.createSuccessDesc", { partNumber: data.part_number }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-parts-all"] });
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
    if (!formData.job_id || !formData.part_number || !formData.material) {
      toast({
        title: t("common.validationError"),
        description: t("parts.requiredFieldsMissing"),
        variant: "destructive",
      });
      return;
    }
    createPartMutation.mutate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("parts.createPart")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Selection */}
          <div>
            <Label>{t("parts.selectJob")} *</Label>
            <Select
              value={formData.job_id}
              onValueChange={(value) => setFormData({ ...formData, job_id: value, parent_part_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("parts.selectJobPlaceholder")} />
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

          {/* Part Number */}
          <div>
            <Label>{t("parts.partNumber")} *</Label>
            <Input
              value={formData.part_number}
              onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
              placeholder={t("parts.partNumberPlaceholder")}
            />
          </div>

          {/* Material */}
          <div>
            <Label>{t("parts.material")} *</Label>
            <Input
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              placeholder={t("parts.materialPlaceholder")}
            />
          </div>

          {/* Quantity */}
          <div>
            <Label>{t("parts.quantity")}</Label>
            <Input
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          {/* Parent Part (Optional) */}
          {formData.job_id && existingParts && existingParts.length > 0 && (
            <div>
              <Label>{t("parts.parentPartOptional")}</Label>
              <Select
                value={formData.parent_part_id || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, parent_part_id: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("parts.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("parts.none")}</SelectItem>
                  {existingParts.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.part_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>{t("parts.notes")}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder={t("parts.notesPlaceholder")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={createPartMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createPartMutation.isPending ? t("parts.creating") : t("parts.createPart")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
