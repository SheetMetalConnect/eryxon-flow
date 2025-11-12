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
  const [addingOperation, setAddingOperation] = useState(false);
  const [newOperation, setNewOperation] = useState({
    operation_name: "",
    cell_id: "",
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
          job:jobs(job_number, customer)
        `)
        .eq("id", partId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: cells } = useQuery({
    queryKey: ["cells"],
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

  const { data: operations, refetch: refetchOperations } = useQuery({
    queryKey: ["operations", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select(`
          *,
          cell:cells(name, color),
          assigned_operator:profiles(full_name)
        `)
        .eq("part_id", partId)
        .order("sequence");
      if (error) throw error;
      return data;
    },
  });

  const addOperationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("operations").insert({
        part_id: partId,
        operation_name: newOperation.operation_name,
        cell_id: newOperation.cell_id,
        estimated_time: newOperation.estimated_time || null,
        sequence: newOperation.sequence,
        notes: newOperation.notes || null,
        status: "not_started",
        tenant_id: (part as any)?.tenant_id,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: "Operation added",
        description: "New operation has been added to the part.",
      });
      setAddingOperation(false);
      setNewOperation({
        operation_name: "",
        cell_id: "",
        estimated_time: 0,
        sequence: 1,
        notes: "",
      });
      await refetchOperations();
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

  const handleAddOperation = () => {
    if (!newOperation.operation_name || !newOperation.cell_id) {
      toast({
        title: "Validation error",
        description: "Operation name and cell are required",
        variant: "destructive",
      });
      return;
    }
    addOperationMutation.mutate();
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
              <Label>Current Cell</Label>
              <div className="mt-1">
                {(() => {
                  const cell = (cells || []).find((c: any) => c.id === (part as any)?.current_cell_id);
                  return cell ? (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: cell.color || undefined,
                        backgroundColor: `${cell.color || "#999"}20`,
                      }}
                    >
                      {cell.name}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">Not started</span>
                  );
                })()}
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

          {/* Operations */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg">Operations ({operations?.length || 0})</Label>
              <Button size="sm" onClick={() => setAddingOperation(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Operation
              </Button>
            </div>

            {/* Add Operation Form */}
            {addingOperation && (
              <div className="border rounded-lg p-4 mb-4 bg-blue-50">
                <h4 className="font-semibold mb-3">New Operation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Operation Name *</Label>
                    <Input
                      value={newOperation.operation_name}
                      onChange={(e) =>
                        setNewOperation({ ...newOperation, operation_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Cell *</Label>
                    <Select
                      value={newOperation.cell_id}
                      onValueChange={(value) =>
                        setNewOperation({ ...newOperation, cell_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cell" />
                      </SelectTrigger>
                      <SelectContent>
                        {cells?.map((cell: any) => (
                          <SelectItem key={cell.id} value={cell.id}>
                            {cell.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Time (minutes)</Label>
                    <Input
                      type="number"
                      value={newOperation.estimated_time || ""}
                      onChange={(e) =>
                        setNewOperation({
                          ...newOperation,
                          estimated_time: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sequence</Label>
                    <Input
                      type="number"
                      value={newOperation.sequence}
                      onChange={(e) =>
                        setNewOperation({
                          ...newOperation,
                          sequence: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newOperation.notes}
                      onChange={(e) =>
                        setNewOperation({ ...newOperation, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddOperation} disabled={addOperationMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {addOperationMutation.isPending ? "Saving..." : "Save Operation"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddingOperation(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Operations List */}
            <div className="space-y-2">
              {operations?.map((op: any) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: op.cell?.color,
                        backgroundColor: `${op.cell?.color || "#999"}20`,
                      }}
                    >
                      {op.cell?.name}
                    </Badge>
                    <div>
                      <p className="font-medium">{op.operation_name}</p>
                      <p className="text-xs text-gray-500">
                        Seq: {op.sequence}
                        {op.estimated_time && ` | Est: ${op.estimated_time}min`}
                        {op.assigned_operator && (
                          <span className="ml-2">
                            | Assigned: {op.assigned_operator.full_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={op.status === "completed" ? "default" : "secondary"}>
                    {op.status?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {(operations?.length || 0) === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No operations added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
