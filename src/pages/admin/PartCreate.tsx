import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Package,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Operation {
  id: string;
  operation_name: string;
  cell_id: string;
  estimated_time?: number;
  sequence: number;
  notes?: string;
}

export default function PartCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [jobId, setJobId] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [parentPartId, setParentPartId] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [editingOperation, setEditingOperation] = useState<Partial<Operation> | null>(null);

  // Fetch jobs for selection
  const { data: jobs } = useQuery({
    queryKey: ["jobs-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number, customer")
        .in("status", ["not_started", "in_progress"])
        .order("job_number");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing parts from selected job for parent selection
  const { data: existingParts } = useQuery({
    queryKey: ["job-parts", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("parts")
        .select("id, part_number")
        .eq("job_id", jobId)
        .order("part_number");
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  // Fetch materials from config
  const { data: materials } = useQuery({
    queryKey: ["materials-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cells for operations
  const { data: cells } = useQuery({
    queryKey: ["cells-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("id, name")
        .eq("active", true)
        .order("sequence");
      if (error) throw error;
      return data;
    },
  });

  const createPartMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant ID");
      if (!jobId) throw new Error("Job is required");
      if (!partNumber) throw new Error("Part number is required");
      if (!material) throw new Error("Material is required");

      // Create the part
      const { data: part, error: partError } = await supabase
        .from("parts")
        .insert({
          tenant_id: profile.tenant_id,
          job_id: jobId,
          part_number: partNumber,
          material: material,
          quantity: quantity,
          parent_part_id: parentPartId || null,
          notes: notes || null,
          status: "not_started",
        })
        .select()
        .single();

      if (partError) throw partError;

      // Create operations if any
      if (operations.length > 0) {
        const operationsToInsert = operations.map((op) => ({
          tenant_id: profile.tenant_id,
          part_id: part.id,
          operation_name: op.operation_name,
          cell_id: op.cell_id,
          estimated_time: op.estimated_time || 0,
          sequence: op.sequence,
          notes: op.notes || null,
          status: "not_started" as const,
        }));

        const { error: opsError } = await supabase
          .from("operations")
          .insert(operationsToInsert);

        if (opsError) throw opsError;
      }

      return part;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parts-all"] });
      toast({
        title: t("parts.partCreated"),
        description: t("parts.partCreatedDesc", { partNumber }),
      });
      navigate("/admin/parts");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddOperation = () => {
    if (!editingOperation?.operation_name || !editingOperation?.cell_id) {
      toast({
        title: t("common.validationError"),
        description: t("operations.nameAndCellRequired"),
        variant: "destructive",
      });
      return;
    }

    const newOperation: Operation = {
      id: crypto.randomUUID(),
      operation_name: editingOperation.operation_name,
      cell_id: editingOperation.cell_id,
      estimated_time: editingOperation.estimated_time,
      sequence: operations.length + 1,
      notes: editingOperation.notes,
    };

    setOperations([...operations, newOperation]);
    setEditingOperation(null);
  };

  const handleRemoveOperation = (id: string) => {
    setOperations(operations.filter((op) => op.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPartMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <Button variant="outline" onClick={() => navigate("/admin/parts")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("parts.backToParts")}
        </Button>
        <h1 className="text-3xl font-bold">{t("parts.createPart")}</h1>
        <p className="text-muted-foreground mt-1">{t("parts.createPartDesc")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Part Details */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("parts.partDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("parts.job")} *</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("parts.selectJob")} />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("parts.partNumber")} *</Label>
                <Input
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g., PART-001"
                  required
                />
              </div>
              <div>
                <Label>{t("parts.material")} *</Label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("parts.selectMaterial")} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials?.map((mat) => (
                      <SelectItem key={mat.id} value={mat.name}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("parts.quantity")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>{t("parts.parentPartOptional")}</Label>
                <Select
                  value={parentPartId || "__none__"}
                  onValueChange={(v) => setParentPartId(v === "__none__" ? undefined : v)}
                  disabled={!jobId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("parts.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("parts.none")}</SelectItem>
                    {existingParts?.map((part) => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.part_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t("parts.notes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("parts.notesPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t("operations.operations")}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingOperation({ sequence: operations.length + 1 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("operations.addOperation")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Operation Form */}
            {editingOperation && (
              <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("operations.operationName")} *</Label>
                    <Input
                      value={editingOperation.operation_name || ""}
                      onChange={(e) =>
                        setEditingOperation({ ...editingOperation, operation_name: e.target.value })
                      }
                      placeholder={t("operations.operationNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("operations.cell")} *</Label>
                    <Select
                      value={editingOperation.cell_id}
                      onValueChange={(v) =>
                        setEditingOperation({ ...editingOperation, cell_id: v })
                      }
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("operations.estimatedTimeMinutes")}</Label>
                    <Input
                      type="number"
                      value={editingOperation.estimated_time || ""}
                      onChange={(e) =>
                        setEditingOperation({
                          ...editingOperation,
                          estimated_time: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("operations.notes")}</Label>
                    <Input
                      value={editingOperation.notes || ""}
                      onChange={(e) =>
                        setEditingOperation({ ...editingOperation, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddOperation}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("operations.saveOperation")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingOperation(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* Operations List */}
            {operations.length === 0 && !editingOperation && (
              <p className="text-muted-foreground text-sm text-center py-4">
                {t("operations.noOperationsYet")}
              </p>
            )}
            {operations.map((op, index) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{op.operation_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("operations.seq")}: {index + 1}
                    {op.estimated_time && ` | ${t("operations.est")}: ${op.estimated_time} ${t("operations.min")}`}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOperation(op.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/parts")}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={createPartMutation.isPending || !jobId || !partNumber || !material}
          >
            <Package className="mr-2 h-4 w-4" />
            {createPartMutation.isPending ? t("common.saving") : t("parts.createPart")}
          </Button>
        </div>
      </form>
    </div>
  );
}
