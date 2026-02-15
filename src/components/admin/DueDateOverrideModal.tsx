import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DueDateOverrideModalProps {
  jobId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DueDateOverrideModal({
  jobId,
  onClose,
  onUpdate,
}: DueDateOverrideModalProps) {
  const { t } = useTranslation();
  const [overrideDate, setOverrideDate] = useState<Date | undefined>(undefined);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-dates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("due_date, due_date_override")
        .eq("id", jobId)
        .single();

      if (error) throw error;

      // Set initial override date if exists
      if (data.due_date_override) {
        setOverrideDate(new Date(data.due_date_override));
      }

      return data;
    },
  });

  const updateOverrideMutation = useMutation({
    mutationFn: async (newDate: Date | null) => {
      const { error } = await supabase
        .from("jobs")
        .update({ due_date_override: newDate?.toISOString() || null })
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("jobs.dueDateUpdated"), {
        description: t("jobs.dueDateUpdateSuccess"),
      });
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast.error(t("common.error"), {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (overrideDate) {
      updateOverrideMutation.mutate(overrideDate);
    }
  };

  const handleClear = () => {
    updateOverrideMutation.mutate(null);
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">{t("common.loading")}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("jobs.overrideDueDate")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Original Due Date */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("jobs.originalDueDate")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(job?.due_date), "MMM dd, yyyy")}
              </span>
            </div>
          </div>

          {/* Current Override */}
          {job?.due_date_override && (
            <div>
              <Label className="text-sm text-muted-foreground">{t("jobs.currentOverride")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <CalendarIcon className="h-4 w-4 text-brand-primary" />
                <span className="font-medium text-brand-primary">
                  {format(new Date(job.due_date_override), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          )}

          {/* New Override Picker */}
          <div>
            <Label>{t("jobs.selectNewOverrideDate")}</Label>
            <div className="mt-2 border rounded-md p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={overrideDate}
                onSelect={setOverrideDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md"
              />
            </div>
          </div>

          {overrideDate && (
            <div className="bg-alert-info-bg border border-alert-info-border rounded-md p-3">
              <Label className="text-sm text-brand-primary">{t("jobs.newDueDate")}</Label>
              <p className="font-semibold text-brand-primary">
                {format(overrideDate, "MMM dd, yyyy")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4">
          {job?.due_date_override && (
            <Button variant="outline" onClick={handleClear}>
              {t("jobs.clearOverride")}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!overrideDate}>
            {t("jobs.saveOverride")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
