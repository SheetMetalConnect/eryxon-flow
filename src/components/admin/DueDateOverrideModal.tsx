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
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon } from "lucide-react";

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
  const { toast } = useToast();
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
      toast({
        title: "Due date updated",
        description: "Due date override has been saved successfully.",
      });
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
          <div className="text-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Override Due Date</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Due Date */}
          <div>
            <Label className="text-sm text-gray-600">Original Due Date</Label>
            <div className="flex items-center gap-2 mt-1">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                {format(new Date(job?.due_date), "MMM dd, yyyy")}
              </span>
            </div>
          </div>

          {/* Current Override */}
          {job?.due_date_override && (
            <div>
              <Label className="text-sm text-gray-600">Current Override</Label>
              <div className="flex items-center gap-2 mt-1">
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-600">
                  {format(new Date(job.due_date_override), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          )}

          {/* New Override Picker */}
          <div>
            <Label>Select New Override Date</Label>
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
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <Label className="text-sm text-blue-800">New Due Date</Label>
              <p className="font-semibold text-blue-900">
                {format(overrideDate, "MMM dd, yyyy")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {job?.due_date_override && (
            <Button variant="outline" onClick={handleClear}>
              Clear Override
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!overrideDate}>
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
