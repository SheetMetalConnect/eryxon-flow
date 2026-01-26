import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  Search,
  Package,
} from "lucide-react";
import { useCreateBatch, type BatchType } from "@/hooks/useBatches";
import { ScrollArea } from "@/components/ui/scroll-area";

const BATCH_TYPES: { value: BatchType; labelKey: string }[] = [
  { value: "laser_nesting", labelKey: "batches.types.laserNesting" },
  { value: "tube_batch", labelKey: "batches.types.tubeBatch" },
  { value: "saw_batch", labelKey: "batches.types.sawBatch" },
  { value: "finishing_batch", labelKey: "batches.types.finishingBatch" },
  { value: "general", labelKey: "batches.types.general" },
];

interface OperationForSelection {
  id: string;
  operation_name: string;
  status: string;
  part: {
    id: string;
    part_number: string;
    material: string;
    quantity: number;
    job: {
      id: string;
      job_number: string;
      customer: string;
    };
  };
}

export default function BatchCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createBatch = useCreateBatch();

  // Form state
  const [batchNumber, setBatchNumber] = useState("");
  const [batchType, setBatchType] = useState<BatchType>("laser_nesting");
  const [cellId, setCellId] = useState("");
  const [material, setMaterial] = useState("");
  const [thickness, setThickness] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [operationSearch, setOperationSearch] = useState("");

  // Fetch cells
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

  // Fetch available operations (not_started or in_progress, not already in a batch)
  const { data: availableOperations } = useQuery({
    queryKey: ["operations-for-batch", cellId],
    queryFn: async () => {
      let query = supabase
        .from("operations")
        .select(`
          id,
          operation_name,
          status,
          part:parts(
            id,
            part_number,
            material,
            quantity,
            job:jobs(id, job_number, customer)
          )
        `)
        .in("status", ["not_started", "in_progress"]);

      if (cellId) {
        query = query.eq("cell_id", cellId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Filter out operations already in a batch
      const { data: batchedOps } = await supabase
        .from("batch_operations")
        .select("operation_id");

      const batchedIds = new Set(batchedOps?.map(bo => bo.operation_id) || []);

      return (data as unknown as OperationForSelection[]).filter(
        op => !batchedIds.has(op.id)
      );
    },
    enabled: true,
  });

  // Filter operations by search
  const filteredOperations = availableOperations?.filter(op => {
    if (!operationSearch) return true;
    const search = operationSearch.toLowerCase();
    return (
      op.operation_name.toLowerCase().includes(search) ||
      op.part?.part_number.toLowerCase().includes(search) ||
      op.part?.job?.job_number.toLowerCase().includes(search) ||
      op.part?.job?.customer?.toLowerCase().includes(search)
    );
  });

  const toggleOperation = (opId: string) => {
    setSelectedOperations(prev =>
      prev.includes(opId)
        ? prev.filter(id => id !== opId)
        : [...prev, opId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchNumber || !cellId) {
      return;
    }

    createBatch.mutate(
      {
        batch_number: batchNumber,
        batch_type: batchType,
        cell_id: cellId,
        material: material || undefined,
        thickness_mm: thickness,
        notes: notes || undefined,
        operation_ids: selectedOperations,
      },
      {
        onSuccess: () => {
          navigate("/admin/batches");
        },
      }
    );
  };

  // Generate batch number suggestion
  const generateBatchNumber = () => {
    const prefix = batchType === "laser_nesting" ? "NEST" :
                   batchType === "tube_batch" ? "TUBE" :
                   batchType === "saw_batch" ? "SAW" :
                   batchType === "finishing_batch" ? "FIN" : "BATCH";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setBatchNumber(`${prefix}-${date}-${random}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <Button variant="outline" onClick={() => navigate("/admin/batches")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <h1 className="text-3xl font-bold">{t("batches.createBatch")}</h1>
        <p className="text-muted-foreground mt-1">{t("batches.createDescription")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Batch Details */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                {t("batches.batchDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("batches.batchNumber")} *</Label>
                <div className="flex gap-2">
                  <Input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="NEST-20240115-ABC1"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateBatchNumber}>
                    {t("batches.generate")}
                  </Button>
                </div>
              </div>

              <div>
                <Label>{t("batches.type")} *</Label>
                <Select value={batchType} onValueChange={(v) => setBatchType(v as BatchType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BATCH_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("batches.cell")} *</Label>
                <Select value={cellId} onValueChange={setCellId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("batches.selectCell")} />
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
                <div>
                  <Label>{t("batches.material")}</Label>
                  <Select
                    value={material || "__none__"}
                    onValueChange={(v) => setMaterial(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("batches.selectMaterial")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("parts.none")}</SelectItem>
                      {materials?.map((mat) => (
                        <SelectItem key={mat.id} value={mat.name}>
                          {mat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("batches.thickness")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={thickness || ""}
                    onChange={(e) => setThickness(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="mm"
                  />
                </div>
              </div>

              <div>
                <Label>{t("batches.notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Operations Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("batches.selectOperations")}
                {selectedOperations.length > 0 && (
                  <Badge variant="secondary">{selectedOperations.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={operationSearch}
                  onChange={(e) => setOperationSearch(e.target.value)}
                  placeholder={t("batches.searchOperations")}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[400px] border rounded-md p-2">
                {!cellId ? (
                  <div className="text-center text-muted-foreground py-8">
                    {t("batches.selectCellFirst")}
                  </div>
                ) : filteredOperations?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {t("batches.noOperationsAvailable")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOperations?.map((op) => (
                      <div
                        key={op.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedOperations.includes(op.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleOperation(op.id)}
                      >
                        <Checkbox
                          checked={selectedOperations.includes(op.id)}
                          onCheckedChange={() => toggleOperation(op.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{op.operation_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {op.part?.job?.job_number} - {op.part?.part_number}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {op.part?.material}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {t("parts.qty")}: {op.part?.quantity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedOperations.length > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {t("batches.operationsSelected", { count: selectedOperations.length })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOperations([])}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("batches.clearSelection")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/batches")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={createBatch.isPending || !batchNumber || !cellId}>
            <Plus className="mr-2 h-4 w-4" />
            {createBatch.isPending ? t("batches.creating") : t("batches.createBatch")}
          </Button>
        </div>
      </form>
    </div>
  );
}
