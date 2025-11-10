import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PartDetailModalProps {
  partId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PartDetailModal({ partId, onClose, onUpdate }: PartDetailModalProps) {
  const { toast } = useToast();
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    task_name: "",
    stage_id: "",
    estimated_time: 0,
    sequence: 1,
    notes: "",
  });

  const { data: part, isLoading } = useQuery({
    queryKey: ["part-detail", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select(`
          *,
          job:jobs(job_number, customer),
          stage:stages(name, color),
          tasks (
            *,
            stage:stages(name, color),
            assigned_operator:profiles(full_name)
          )
        `)
        .eq("id", partId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("active", true)
        .order("sequence");

      if (error) throw error;
      return data;
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        part_id: partId,
        task_name: newTask.task_name,
        stage_id: newTask.stage_id,
        estimated_time: newTask.estimated_time || null,
        sequence: newTask.sequence,
        notes: newTask.notes || null,
        status: "not_started",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Task added",
        description: "New task has been added to the part.",
      });
      setAddingTask(false);
      setNewTask({
        task_name: "",
        stage_id: "",
        estimated_time: 0,
        sequence: 1,
        notes: "",
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTask = () => {
    if (!newTask.task_name || !newTask.stage_id) {
      toast({
        title: "Validation error",
        description: "Task name and stage are required",
        variant: "destructive",
      });
      return;
    }
    addTaskMutation.mutate();
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Loading part details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Part Details: {part?.part_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Part Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Number</Label>
              <p className="mt-1 font-medium">{part?.job?.job_number}</p>
            </div>

            <div>
              <Label>Customer</Label>
              <p className="mt-1 font-medium">{part?.job?.customer}</p>
            </div>

            <div>
              <Label>Material</Label>
              <p className="mt-1 font-medium">{part?.material}</p>
            </div>

            <div>
              <Label>Quantity</Label>
              <p className="mt-1 font-medium">{part?.quantity}</p>
            </div>

            <div>
              <Label>Status</Label>
              <div className="mt-1">
                <Badge>{part?.status?.replace("_", " ").toUpperCase()}</Badge>
              </div>
            </div>

            <div>
              <Label>Current Stage</Label>
              <div className="mt-1">
                {part?.stage ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: part.stage.color,
                      backgroundColor: `${part.stage.color}20`,
                    }}
                  >
                    {part.stage.name}
                  </Badge>
                ) : (
                  <span className="text-gray-400 text-sm">Not started</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {part?.notes && (
            <div>
              <Label>Notes</Label>
              <p className="mt-1 text-sm text-gray-600">{part.notes}</p>
            </div>
          )}

          {/* Metadata */}
          {part?.metadata && Object.keys(part.metadata).length > 0 && (
            <div>
              <Label>Custom Metadata</Label>
              <div className="mt-2 border rounded-md p-3">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(part.metadata).map(([key, value]) => (
                      <tr key={key}>
                        <td className="font-medium py-1 pr-4">{key}:</td>
                        <td className="py-1">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg">Tasks ({part?.tasks?.length || 0})</Label>
              <Button size="sm" onClick={() => setAddingTask(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>

            {/* Add Task Form */}
            {addingTask && (
              <div className="border rounded-lg p-4 mb-4 bg-blue-50">
                <h4 className="font-semibold mb-3">New Task</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Task Name *</Label>
                    <Input
                      value={newTask.task_name}
                      onChange={(e) =>
                        setNewTask({ ...newTask, task_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Stage *</Label>
                    <Select
                      value={newTask.stage_id}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, stage_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages?.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Time (minutes)</Label>
                    <Input
                      type="number"
                      value={newTask.estimated_time || ""}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          estimated_time: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sequence</Label>
                    <Input
                      type="number"
                      value={newTask.sequence}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          sequence: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newTask.notes}
                      onChange={(e) =>
                        setNewTask({ ...newTask, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddTask} disabled={addTaskMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {addTaskMutation.isPending ? "Saving..." : "Save Task"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddingTask(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
              {part?.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: task.stage?.color,
                        backgroundColor: `${task.stage?.color}20`,
                      }}
                    >
                      {task.stage?.name}
                    </Badge>
                    <div>
                      <p className="font-medium">{task.task_name}</p>
                      <p className="text-xs text-gray-500">
                        Seq: {task.sequence}
                        {task.estimated_time && ` | Est: ${task.estimated_time}min`}
                        {task.assigned_operator && (
                          <span className="ml-2">
                            | Assigned: {task.assigned_operator.full_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                    {task.status?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {part?.tasks?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
