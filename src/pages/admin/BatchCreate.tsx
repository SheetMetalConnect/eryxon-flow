import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
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
  Upload,
  Image as ImageIcon,
  FileCode,
  Save
} from "lucide-react";
import {
  useCreateBatch,
  useUpdateBatch,
  useBatch,
  useBatchOperations,
  type BatchType,
  type Batch
} from "@/hooks/useBatches";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

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

  const { profile } = useAuth();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  // Fetch data if editing
  const { data: existingBatch, isLoading: batchLoading } = useBatch(id);
  const { data: existingOperations, isLoading: opsLoading } = useBatchOperations(id);

  // Form state
  const [batchNumber, setBatchNumber] = useState("");
  const [batchType, setBatchType] = useState<BatchType>("laser_nesting");
  const [cellId, setCellId] = useState("");
  const [material, setMaterial] = useState("");
  const [thickness, setThickness] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [operationSearch, setOperationSearch] = useState("");
  const [searchParams] = useSearchParams();

  // New fields
  const [parentBatchId, setParentBatchId] = useState<string>("__none__");
  const [nestingImageUrl, setNestingImageUrl] = useState("");
  const [layoutImageUrl, setLayoutImageUrl] = useState("");
  const [metadataJson, setMetadataJson] = useState("{}");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && existingBatch && existingOperations) {
      setBatchNumber(existingBatch.batch_number);
      setBatchType(existingBatch.batch_type);
      setCellId(existingBatch.cell_id);
      setMaterial(existingBatch.material || "");
      setThickness(existingBatch.thickness_mm || undefined);
      setNotes(existingBatch.notes || "");
      setParentBatchId(existingBatch.parent_batch_id || "__none__");
      setNestingImageUrl(existingBatch.nesting_image_url || "");
      setLayoutImageUrl(existingBatch.layout_image_url || "");

      if (existingBatch.nesting_metadata) {
        setMetadataJson(JSON.stringify(existingBatch.nesting_metadata, null, 2));
      }

      // Set selected operations
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

  // Fetch cells
  const { data: cells } = useQuery({
    queryKey: ["cells-active", profile?.tenant_id],
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

  // Fetch materials from config
  const { data: materials } = useQuery({
    queryKey: ["materials-active", profile?.tenant_id],
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

  // Fetch potential parent batches
  const { data: parentBatches } = useQuery({
    queryKey: ["batches-potential-parents", profile?.tenant_id],
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


  // Fetch available operations
  const { data: availableOperations } = useQuery({
    queryKey: ["operations-for-batch", cellId, profile?.tenant_id],
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

      if (cellId) {
        query = query.eq("cell_id", cellId);
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

      return (data as unknown as OperationForSelection[]).filter(
        op => !batchedIds.has(op.id)
      );
    },
    enabled: !!profile?.tenant_id,
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
    } catch (error: any) {
      toast.error(t("batches.imageUploadFailed"), { description: error.message });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchNumber || !cellId) {
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
      // Operations update logic is tricky. 
      // useUpdateBatch currently only updates fields on the batch, not the relationship.
      // We might need to manually handle operation association changes if useUpdateBatch doesn't support it.
      // Looking at useBatches.ts, useUpdateBatch only calls .update().
      // So for operations, we need separate logic to add/remove if the list changed.
      // For now, let's assume useUpdateBatch ONLY updates fields. 
      // Realistically, updating operations in batch edit is complex (add/remove). 
      // I'll skip operation updates in edit mode for now to keep it simple, or just implement it properly.

      // Let's just update the batch fields for now.
      updateBatch.mutate({
        id: id,
        updates: batchData
      }, {
        onSuccess: () => {
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
    return <div className="p-8 text-center">{t("batches.loadingDetails")}</div>;
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
                  {!isEditing && (
                    <Button type="button" variant="outline" onClick={generateBatchNumber}>
                      {t("batches.generate")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Parent Batch Selection */}
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
                        {b.batch_number} ({t(`batches.types.${b.batch_type === "laser_nesting" ? "laserNesting" :
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

              {/* Images */}
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

              {/* Metadata JSON */}
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
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedOperations.includes(op.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                          }`}
                        onClick={() => !isEditing && toggleOperation(op.id)} // Disable toggling in edit mode for now as I'm not handling op updates
                      >
                        <Checkbox
                          checked={selectedOperations.includes(op.id)}
                          onCheckedChange={() => !isEditing && toggleOperation(op.id)}
                          disabled={isEditing}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="text-left flex-1 min-w-0">
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

              {isEditing && (
                <div className="p-3 bg-muted/50 text-xs text-muted-foreground rounded-md border text-center">
                  {t("batches.editOperationsHint")}
                </div>
              )}

              {selectedOperations.length > 0 && !isEditing && (
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
          <Button type="submit" disabled={createBatch.isPending || updateBatch.isPending || !batchNumber || !cellId || uploadingImage}>
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
