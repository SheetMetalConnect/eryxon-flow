import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryKeys } from "@/lib/queryClient";
import { useProfile } from "@/hooks/useProfile";
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
  Upload,
  Image as ImageIcon,
  FileCode,
  Save,
  Loader2
} from "lucide-react";
import {
  useCreateBatch,
  useUpdateBatch,
  useAddOperationsToBatch,
  useRemoveOperationFromBatch,
  useBatch,
  useBatchOperations,
  type BatchType,
  type Batch
} from "@/hooks/useBatches";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

/**
 * Safely unwrap a PostgREST embedded resource that may be returned as
 * an array (when the FK hint is ambiguous) or as a single object.
 * Returns the first element if it's an array, the object itself otherwise,
 * or undefined if null/undefined.
 */
function unwrapRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value;
}

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
  const { id } = useParams<{ id: string }>(); // Check for ID to determine if editing
  const isEditing = !!id;

  const profile = useProfile();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const addOperationsToBatch = useAddOperationsToBatch();
  const removeOperationFromBatch = useRemoveOperationFromBatch();
  const { data: existingBatch, isLoading: batchLoading } = useBatch(id);
  const { data: existingOperations, isLoading: opsLoading } = useBatchOperations(id);

  const [batchNumber, setBatchNumber] = useState("");
  const [batchType, setBatchType] = useState<BatchType>("laser_nesting");
  const [cellId, setCellId] = useState("__none__");
  const [material, setMaterial] = useState("");
  const [thickness, setThickness] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [operationSearch, setOperationSearch] = useState("");
  const [searchParams] = useSearchParams();

  const [parentBatchId, setParentBatchId] = useState<string>("__none__");
  const [nestingImageUrl, setNestingImageUrl] = useState("");
  const [layoutImageUrl, setLayoutImageUrl] = useState("");
  const [metadataJson, setMetadataJson] = useState("{}");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isEditing && existingBatch && existingOperations) {
      setBatchNumber(existingBatch.batch_number);
      setBatchType(existingBatch.batch_type);
      setCellId(existingBatch.cell_id || "__none__");
      setMaterial(existingBatch.material || "");
      setThickness(existingBatch.thickness_mm || undefined);
      setNotes(existingBatch.notes || "");
      setParentBatchId(existingBatch.parent_batch_id || "__none__");
      setNestingImageUrl(existingBatch.nesting_image_url || "");
      setLayoutImageUrl(existingBatch.layout_image_url || "");

      if (existingBatch.nesting_metadata) {
        setMetadataJson(JSON.stringify(existingBatch.nesting_metadata, null, 2));
      }

      const opIds = existingOperations.map(bo => bo.operation_id);
      setSelectedOperations(opIds);
    }
  }, [isEditing, existingBatch, existingOperations]);


  // Handle operation pre-selection from search params (only for create)
  useEffect(() => {
    if (!isEditing) {
      const ids = searchParams.get("operationIds");
      if (ids) {
        setSelectedOperations(ids.split(","));
      }
      const parentId = searchParams.get("parentId");
      if (parentId) {
        setParentBatchId(parentId);
      }
    }
  }, [searchParams, isEditing]);

  const { data: cells } = useQuery({
    queryKey: QueryKeys.cells.active(profile?.tenant_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("id, name")
        .eq("tenant_id", profile!.tenant_id)
        .eq("active", true)
        .order("sequence");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: materials } = useQuery({
    queryKey: QueryKeys.config.materialsActive(profile?.tenant_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name")
        .eq("tenant_id", profile!.tenant_id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: parentBatches } = useQuery({
    queryKey: QueryKeys.batches.potentialParents(profile?.tenant_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_batches")
        .select("id, batch_number, batch_type")
        .eq("tenant_id", profile!.tenant_id)
        .is("parent_batch_id", null) // Only fetch top-level batches
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Pick<Batch, "id" | "batch_number" | "batch_type">[];
    },
    enabled: !!profile?.tenant_id,
  });


  const activeCellId = cellId === "__none__" ? "" : cellId;

  const { data: availableOperations, isLoading: opsAvailableLoading } = useQuery({
    queryKey: QueryKeys.operations.forBatch(activeCellId || ''),
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
        .eq("tenant_id", profile!.tenant_id)
        .in("status", ["not_started", "in_progress"]);

      if (activeCellId) {
        query = query.eq("cell_id", activeCellId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Filter out operations already in a batch (UNLESS they are in THIS batch being edited)
      const { data: batchedOps } = await supabase
        .from("batch_operations")
        .select("operation_id, batch_id")
        .eq("tenant_id", profile!.tenant_id);

      const batchedIds = new Set(
        batchedOps
          ?.filter(bo => bo.batch_id !== id) // Allow operations already in this batch
          .map(bo => bo.operation_id) || []
      );

      // Unwrap PostgREST embedded resources that may come back as arrays
      const normalized = (data ?? []).map((row: Record<string, unknown>) => {
        const part = unwrapRelation(row.part as OperationForSelection["part"] | OperationForSelection["part"][] | null);
        const job = part ? unwrapRelation((part as Record<string, unknown>).job as OperationForSelection["part"]["job"] | OperationForSelection["part"]["job"][] | null) : undefined;
        return {
          id: String(row.id ?? ""),
          operation_name: String(row.operation_name ?? ""),
          status: String(row.status ?? ""),
          part: part ? {
            id: String(part.id ?? ""),
            part_number: String(part.part_number ?? ""),
            material: String(part.material ?? ""),
            quantity: Number(part.quantity ?? 0),
            job: job ? {
              id: String(job.id ?? ""),
              job_number: String(job.job_number ?? ""),
              customer: String(job.customer ?? ""),
            } : { id: "", job_number: "", customer: "" },
          } : { id: "", part_number: "", material: "", quantity: 0, job: { id: "", job_number: "", customer: "" } },
        } satisfies OperationForSelection;
      });

      return normalized.filter(
        (op: OperationForSelection) => !batchedIds.has(op.id)
      );
    },
    enabled: !!profile?.tenant_id,
  });

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'nesting' | 'layout') => {
    try {
      setUploadingImage(true);
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${id || 'temp'}/${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('batch-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Use signed URL for private bucket (expires in 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('batch-images')
        .createSignedUrl(filePath, 31536000); // 1 year in seconds

      if (signedUrlError || !signedUrlData) {
        throw signedUrlError || new Error('Failed to generate signed URL');
      }

      if (type === 'nesting') {
        setNestingImageUrl(signedUrlData.signedUrl);
      } else {
        setLayoutImageUrl(signedUrlData.signedUrl);
      }

      toast.success(t("batches.imageUploaded"), { description: t("batches.imageUploadedDesc") });
    } catch (error: unknown) {
      toast.error(t("batches.imageUploadFailed"), { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchNumber || cellId === "__none__") {
      return;
    }

    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadataJson);
    } catch (e) {
      toast.error(t("batches.invalidJson"), { description: t("batches.invalidJsonDesc") });
      return;
    }

    const batchData = {
      batch_number: batchNumber,
      batch_type: batchType,
      cell_id: cellId,
      material: material || undefined,
      thickness_mm: thickness,
      notes: notes || undefined,
      nesting_image_url: nestingImageUrl || undefined,
      layout_image_url: layoutImageUrl || undefined,
      parent_batch_id: parentBatchId === "__none__" ? null : parentBatchId,
      nesting_metadata: parsedMetadata,
    };

    if (isEditing && id) {
      // Update batch fields
      updateBatch.mutate({
        id: id,
        updates: batchData
      }, {
        onSuccess: async () => {
          // Sync operations: add new ones, remove deselected ones
          const existingOpIds = new Set(existingOperations?.map(bo => bo.operation_id) ?? []);
          const selectedSet = new Set(selectedOperations);

          // Operations to add (selected but not yet in batch)
          const toAdd = selectedOperations.filter(opId => !existingOpIds.has(opId));
          // Operations to remove (in batch but no longer selected)
          const toRemove = existingOperations?.filter(bo => !selectedSet.has(bo.operation_id)) ?? [];

          try {
            if (toAdd.length > 0) {
              await addOperationsToBatch.mutateAsync({ batchId: id, operationIds: toAdd });
            }
            for (const bo of toRemove) {
              await removeOperationFromBatch.mutateAsync({ batchOperationId: bo.id });
            }
          } catch {
            // Toast errors are handled by the mutation hooks
          }

          navigate(`/admin/batches/${id}`);
        }
      });
    } else {
      createBatch.mutate(
        {
          ...batchData,
          operation_ids: selectedOperations,
          parent_batch_id: parentBatchId === "__none__" ? undefined : parentBatchId,
        },
        {
          onSuccess: () => {
            navigate("/admin/batches");
          },
        }
      );
    }
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

  if (isEditing && (batchLoading || opsLoading)) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("batches.loadingDetails")}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <Button variant="outline" onClick={() => navigate("/admin/batches")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <h1 className="text-3xl font-bold">{isEditing ? t("batches.editBatch") : t("batches.createBatch")}</h1>
        <p className="text-muted-foreground mt-1">{isEditing ? t("batches.editDescription") : t("batches.createDescription")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {!isEditing && (
                    <Button type="button" variant="outline" onClick={generateBatchNumber}>
                      {t("batches.generate")}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label>{t("batches.parentBatch")}</Label>
                <Select value={parentBatchId} onValueChange={setParentBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("batches.selectParentBatch")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("batches.noParent")}</SelectItem>
                    {parentBatches?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {String(b.batch_number ?? "")} ({t(`batches.types.${b.batch_type === "laser_nesting" ? "laserNesting" :
                            b.batch_type === "tube_batch" ? "tubeBatch" : "general"
                          }`)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("batches.parentBatchHint")}
                </p>
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
                    <SelectItem value="__none__">{t("batches.selectCell")}</SelectItem>
                    {cells?.map((cell) => (
                      <SelectItem key={cell.id} value={String(cell.id)}>
                        {String(cell.name ?? "")}
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
                        <SelectItem key={mat.id} value={mat.name ?? mat.id}>
                          {String(mat.name ?? "")}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("batches.nestingImage")}</Label>
                  <div className="mt-2 flex items-center gap-2">
                    {nestingImageUrl ? (
                      <div className="relative group w-full h-24 border rounded overflow-hidden">
                        <img src={nestingImageUrl} className="w-full h-full object-cover" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setNestingImageUrl("")}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Label htmlFor="nesting-upload" className="w-full h-24 border border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">{t("batches.upload")}</span>
                        <Input id="nesting-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'nesting')} disabled={uploadingImage} />
                      </Label>
                    )}
                  </div>
                </div>
                <div>
                  <Label>{t("batches.layoutImage")}</Label>
                  <div className="mt-2 flex items-center gap-2">
                    {layoutImageUrl ? (
                      <div className="relative group w-full h-24 border rounded overflow-hidden">
                        <img src={layoutImageUrl} className="w-full h-full object-cover" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setLayoutImageUrl("")}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Label htmlFor="layout-upload" className="w-full h-24 border border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">{t("batches.upload")}</span>
                        <Input id="layout-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'layout')} disabled={uploadingImage} />
                      </Label>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  {t("batches.metadata")}
                </Label>
                <Textarea
                  value={metadataJson}
                  onChange={(e) => setMetadataJson(e.target.value)}
                  rows={4}
                  className="font-mono text-xs mt-1"
                  placeholder='{ "cutting_technology": "fiber_laser", "gas": "nitrogen" }'
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("batches.metadataHint")}
                </p>
              </div>

            </CardContent>
          </Card>

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
                {cellId === "__none__" ? (
                  <div className="text-center text-muted-foreground py-8">
                    {t("batches.selectCellFirst")}
                  </div>
                ) : opsAvailableLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.loading")}
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
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedOperations.includes(op.id)
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
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-medium">{String(op.operation_name ?? "")}</div>
                          <div className="text-sm text-muted-foreground">
                            {String(op.part?.job?.job_number ?? "")} - {String(op.part?.part_number ?? "")}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {String(op.part?.material ?? "-")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {t("parts.qty")}: {op.part?.quantity ?? 0}
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/batches")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={createBatch.isPending || updateBatch.isPending || !batchNumber || cellId === "__none__" || uploadingImage}>
            {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEditing
              ? (updateBatch.isPending ? t("batches.updating") : t("batches.updateBatch"))
              : (createBatch.isPending ? t("batches.creating") : t("batches.createBatch"))
            }
          </Button>
        </div>
      </form>
    </div>
  );
}
