import { useState, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Loader2,
  Plus,
  CalendarOff,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Allocation {
  id: string;
  operation_id: string;
  cell_id: string;
  date: string;
  hours_allocated: number;
  operation?: {
    id: string;
    operation_name: string | null;
    part?: {
      part_number: string;
      job?: {
        job_number: string;
        customer: string | null;
      };
    };
  };
}

interface CellScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: {
    id: string;
    name: string;
    color: string;
    capacity_hours_per_day: number;
  } | null;
  date: Date | null;
  allocations: Allocation[];
  dayInfo: {
    type: string;
    label: string | null;
    multiplier: number;
  };
  capacity: number;
  totalHours: number;
  onDateChange?: (newDate: Date) => void;
  startDate: Date;
}

export function CellScheduleDialog({
  open,
  onOpenChange,
  cell,
  date,
  allocations,
  dayInfo,
  capacity,
  totalHours,
  onDateChange,
  startDate,
}: CellScheduleDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Mutation for updating allocation hours
  const updateAllocation = useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      const { error } = await supabase
        .from("operation_day_allocations")
        .update({ hours_allocated: hours })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day-allocations"] });
      setEditingId(null);
      toast({
        title: t("capacity.updated", "Updated"),
        description: t("capacity.allocationUpdated", "Allocation hours updated successfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting allocation
  const deleteAllocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operation_day_allocations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day-allocations"] });
      toast({
        title: t("capacity.deleted", "Deleted"),
        description: t("capacity.allocationDeleted", "Allocation removed from this day"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePrevDay = () => {
    if (date && onDateChange) {
      onDateChange(subDays(date, 1));
    }
  };

  const handleNextDay = () => {
    if (date && onDateChange) {
      onDateChange(addDays(date, 1));
    }
  };

  const startEdit = (allocation: Allocation) => {
    setEditingId(allocation.id);
    setEditValue(allocation.hours_allocated);
  };

  const saveEdit = () => {
    if (editingId) {
      updateAllocation.mutate({ id: editingId, hours: editValue });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const isNonWorking = dayInfo.type === "holiday" || dayInfo.type === "closure" || dayInfo.type === "weekend";
  const utilizationPercent = capacity > 0 ? (totalHours / capacity) * 100 : 0;

  const getUtilizationColor = () => {
    if (utilizationPercent <= 50) return "bg-green-500";
    if (utilizationPercent <= 80) return "bg-yellow-500";
    if (utilizationPercent <= 100) return "bg-orange-500";
    return "bg-red-500";
  };

  if (!cell || !date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: cell.color || "#ccc" }}
              />
              <DialogTitle>{cell.name}</DialogTitle>
            </div>
            {/* Day navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm min-w-[100px] text-center">
                {format(date, "EEE, MMM d")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription>
            {isNonWorking ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarOff className="h-4 w-4" />
                {dayInfo.label || (dayInfo.type === "weekend" ? "Weekend" : "Non-working day")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {totalHours.toFixed(1)}h / {capacity}h scheduled
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isNonWorking && (
          <>
            {/* Capacity bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">{Math.round(utilizationPercent)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getUtilizationColor()}`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
              {utilizationPercent > 100 && (
                <p className="text-xs text-red-500">
                  Over capacity by {(totalHours - capacity).toFixed(1)}h
                </p>
              )}
            </div>

            {/* Allocations list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Scheduled Operations</h4>
                <span className="text-xs text-muted-foreground">
                  {allocations.length} operation{allocations.length !== 1 ? "s" : ""}
                </span>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No operations scheduled for this day</p>
                  <p className="text-xs mt-1">
                    Use Auto Schedule or manually assign operations
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-2">
                    {allocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {allocation.operation?.part?.job?.job_number || "—"}
                            </Badge>
                            <span className="font-medium truncate">
                              {allocation.operation?.operation_name || "Operation"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {allocation.operation?.part?.part_number || "—"}
                            {allocation.operation?.part?.job?.customer && (
                              <> • {allocation.operation.part.job.customer}</>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          {editingId === allocation.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                                className="w-16 h-8 text-center"
                                min="0"
                                step="0.5"
                                autoFocus
                              />
                              <span className="text-xs text-muted-foreground">h</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={saveEdit}
                                disabled={updateAllocation.isPending}
                              >
                                {updateAllocation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "✓"
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={cancelEdit}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 font-mono"
                                onClick={() => startEdit(allocation)}
                              >
                                {allocation.hours_allocated}h
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteAllocation.mutate(allocation.id)}
                                disabled={deleteAllocation.isPending}
                              >
                                {deleteAllocation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </>
        )}

        {isNonWorking && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{dayInfo.label || "Non-working Day"}</p>
            <p className="text-sm mt-1">
              No operations can be scheduled on this day
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
