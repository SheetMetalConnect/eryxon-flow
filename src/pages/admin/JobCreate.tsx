import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Edit2,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

type Part = {
  id: string;
  part_number: string;
  material: string;
  quantity: number;
  parent_part_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
  operations: Operation[];
};

type Operation = {
  id: string;
  operation_name: string;
  cell_id: string;
  estimated_time?: number;
  sequence: number;
  notes?: string;
};

export default function JobCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);

  // Step 1: Job details
  const [jobNumber, setJobNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [jobMetadata, setJobMetadata] = useState<Record<string, string>>({});

  // Step 2: Parts
  const [parts, setParts] = useState<Part[]>([]);
  const [editingPart, setEditingPart] = useState<Partial<Part> | null>(null);

  // Step 3: Operations
  const [editingOperation, setEditingOperation] = useState<{
    partId: string;
    operation: Partial<Operation>;
  } | null>(null);

  // Fetch cells for operation creation
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

  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant ID");

      // Start transaction
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          tenant_id: profile.tenant_id,
          job_number: jobNumber,
          customer,
          due_date: dueDate,
          notes: jobNotes,
          metadata: Object.keys(jobMetadata).length > 0 ? jobMetadata : null,
          status: "not_started",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Insert parts
      const partsToInsert = parts.map((part) => ({
        tenant_id: profile.tenant_id,
        job_id: job.id,
        part_number: part.part_number,
        material: part.material,
        quantity: part.quantity,
        parent_part_id: part.parent_part_id || undefined,
        notes: part.notes,
        metadata: part.metadata && Object.keys(part.metadata).length > 0 ? part.metadata : null,
        status: "not_started" as const,
      }));

      const { data: insertedParts, error: partsError } = await supabase
        .from("parts")
        .insert(partsToInsert)
        .select();

      if (partsError) throw partsError;

      // Insert operations for each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const insertedPart = insertedParts[i];

        if (part.operations.length > 0) {
          const operationsToInsert = part.operations.map((operation) => ({
            tenant_id: profile.tenant_id,
            part_id: insertedPart.id,
            operation_name: operation.operation_name,
            cell_id: operation.cell_id,
            estimated_time: operation.estimated_time || 0,
            sequence: operation.sequence,
            notes: operation.notes,
            status: "not_started" as const,
          }));

          const { error: operationsError } = await supabase
            .from("operations")
            .insert(operationsToInsert);

          if (operationsError) throw operationsError;
        }
      }

      return job;
    },
    onSuccess: (job) => {
      toast({
        title: t("jobs.createSuccess"),
        description: t("jobs.createSuccessDesc", { jobNumber: job.job_number, count: parts.length }),
      });
      navigate("/admin/jobs");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1 && !jobNumber) {
      toast({
        title: t("common.validationError"),
        description: t("jobs.jobNumberRequired"),
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && parts.length === 0) {
      toast({
        title: t("common.validationError"),
        description: t("jobs.atLeastOnePartRequired"),
        variant: "destructive",
      });
      return;
    }
    if (step === 3) {
      const partsWithoutOperations = parts.filter((p) => p.operations.length === 0);
      if (partsWithoutOperations.length > 0) {
        toast({
          title: t("common.validationError"),
          description: t("jobs.eachPartNeedsOperation"),
          variant: "destructive",
        });
        return;
      }
    }
    setStep(step + 1);
  };

  // Helper function to check for circular references in local parts array
  const wouldCreateCircularReference = (childId: string, parentId: string): boolean => {
    if (childId === parentId) return true;

    let currentParentId: string | undefined = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) return true; // Cycle detected
      visited.add(currentParentId);
      if (currentParentId === childId) return true; // Parent is a descendant

      const parentPart = parts.find(p => p.id === currentParentId);
      currentParentId = parentPart?.parent_part_id;
    }

    return false;
  };

  const handleAddPart = () => {
    if (!editingPart?.part_number || !editingPart?.material) {
      toast({
        title: t("common.validationError"),
        description: t("parts.partNumberMaterialRequired"),
        variant: "destructive",
      });
      return;
    }

    // Check for circular reference
    if (editingPart.parent_part_id) {
      const newPartId = editingPart.id || crypto.randomUUID();
      if (wouldCreateCircularReference(newPartId, editingPart.parent_part_id)) {
        toast({
          title: t("parts.circularReferenceDetected"),
          description: t("parts.circularReferenceDesc"),
          variant: "destructive",
        });
        return;
      }
    }

    const newPart: Part = {
      id: editingPart.id || crypto.randomUUID(),
      part_number: editingPart.part_number,
      material: editingPart.material,
      quantity: editingPart.quantity || 1,
      parent_part_id: editingPart.parent_part_id,
      notes: editingPart.notes,
      metadata: editingPart.metadata,
      operations: [],
    };

    setParts([...parts, newPart]);
    setEditingPart(null);
  };

  const handleAddOperation = (partId: string) => {
    if (!editingOperation?.operation.operation_name || !editingOperation?.operation.cell_id) {
      toast({
        title: t("common.validationError"),
        description: t("operations.nameAndCellRequired"),
        variant: "destructive",
      });
      return;
    }

    const newOperation: Operation = {
      id: crypto.randomUUID(),
      operation_name: editingOperation.operation.operation_name,
      cell_id: editingOperation.operation.cell_id,
      estimated_time: editingOperation.operation.estimated_time,
      sequence: editingOperation.operation.sequence || 1,
      notes: editingOperation.operation.notes,
    };

    setParts(
      parts.map((part) =>
        part.id === partId
          ? { ...part, operations: [...part.operations, newOperation] }
          : part
      )
    );
    setEditingOperation(null);
  };

  const addMetadataField = () => {
    const key = prompt(t("jobs.enterMetadataKey"));
    if (key) {
      setJobMetadata({ ...jobMetadata, [key]: "" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <Button variant="outline" onClick={() => navigate("/admin/jobs")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("jobs.backToJobs")}
        </Button>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          {t("jobs.createNewJob")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t("jobCreate.subtitle")}
        </p>
      </div>

      <hr className="title-divider" />

      {/* Progress Indicator */}
      <div className="flex justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${s <= step ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground"
                }`}
            >
              {s < step ? <Check className="h-5 w-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-20 h-1 mx-2 transition-all ${s < step ? "bg-primary" : "bg-border"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Job Details */}
      {step === 1 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("jobs.step1JobDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("jobs.jobNumber")} *</Label>
                <Input
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="JOB-001"
                />
              </div>
              <div>
                <Label>{t("jobs.customer")} *</Label>
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder={t("jobs.customerPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("jobs.dueDate")} *</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>{t("jobs.notes")}</Label>
              <Textarea
                value={jobNotes}
                onChange={(e) => setJobNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>{t("jobs.customMetadata")}</Label>
                <Button size="sm" variant="outline" onClick={addMetadataField}>
                  <Plus className="h-4 w-4 mr-2" /> {t("jobs.addField")}
                </Button>
              </div>
              {Object.entries(jobMetadata).map(([key, value]) => (
                <div key={key} className="flex gap-2 mb-2">
                  <Input value={key} disabled className="w-1/3" />
                  <Input
                    value={value}
                    onChange={(e) =>
                      setJobMetadata({ ...jobMetadata, [key]: e.target.value })
                    }
                    placeholder={t("jobs.valuePlaceholder")}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const newMetadata = { ...jobMetadata };
                      delete newMetadata[key];
                      setJobMetadata(newMetadata);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Parts */}
      {step === 2 && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t("jobs.step2AddParts")}</CardTitle>
              <Button onClick={() => setEditingPart({})}>
                <Plus className="h-4 w-4 mr-2" /> {t("parts.addPart")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Part Form */}
            {editingPart && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold mb-3">{t("parts.newPart")}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("parts.partNumber")} *</Label>
                    <Input
                      value={editingPart.part_number || ""}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, part_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("parts.material")} *</Label>
                    <Input
                      value={editingPart.material || ""}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, material: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("parts.quantity")}</Label>
                    <Input
                      type="number"
                      value={editingPart.quantity || 1}
                      onChange={(e) =>
                        setEditingPart({
                          ...editingPart,
                          quantity: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("parts.parentPartOptional")}</Label>
                    <Select
                      value={editingPart.parent_part_id || "__none__"}
                      onValueChange={(value) =>
                        setEditingPart({ ...editingPart, parent_part_id: value === "__none__" ? undefined : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("parts.none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("parts.none")}</SelectItem>
                        {parts.map((part) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.part_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>{t("parts.notes")}</Label>
                    <Textarea
                      value={editingPart.notes || ""}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  {/* Material Traceability Section */}
                  <div className="col-span-2 border-t pt-3 mt-2">
                    <h5 className="text-sm font-medium mb-2">Material Traceability (Optional)</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Material Lot/Heat Number</Label>
                        <Input
                          value={(editingPart.metadata as any)?.material_lot || ""}
                          onChange={(e) =>
                            setEditingPart({
                              ...editingPart,
                              metadata: { ...(editingPart.metadata || {}), material_lot: e.target.value }
                            })
                          }
                          placeholder="e.g., LOT-2024-1234"
                        />
                      </div>
                      <div>
                        <Label>Material Supplier</Label>
                        <Input
                          value={(editingPart.metadata as any)?.material_supplier || ""}
                          onChange={(e) =>
                            setEditingPart({
                              ...editingPart,
                              metadata: { ...(editingPart.metadata || {}), material_supplier: e.target.value }
                            })
                          }
                          placeholder="e.g., Metal Supply Co"
                        />
                      </div>
                      <div>
                        <Label>Material Certification #</Label>
                        <Input
                          value={(editingPart.metadata as any)?.material_cert_number || ""}
                          onChange={(e) =>
                            setEditingPart({
                              ...editingPart,
                              metadata: { ...(editingPart.metadata || {}), material_cert_number: e.target.value }
                            })
                          }
                          placeholder="e.g., CERT-ABC-123"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddPart}>
                    <Save className="h-4 w-4 mr-2" /> {t("parts.savePart")}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingPart(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* Parts List */}
            <div className="space-y-2">
              {parts.map((part) => (
                <div key={part.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{part.part_number}</h4>
                      <p className="text-sm text-gray-600">
                        {t("parts.material")}: {part.material} | {t("parts.qty")}: {part.quantity}
                      </p>
                      {part.parent_part_id && (
                        <Badge variant="outline" className="mt-1">
                          {t("parts.assembly")}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setParts(parts.filter((p) => p.id !== part.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Operations */}
      {step === 3 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("jobs.step3AddOperations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {parts.map((part) => (
              <div key={part.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">{t("parts.partNumber")}# {part.part_number}</h4>
                  <Button
                    size="sm"
                    onClick={() =>
                      setEditingOperation({ partId: part.id, operation: { sequence: part.operations.length + 1 } })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" /> {t("operations.addOperation")}
                  </Button>
                </div>

                {/* Operation Form */}
                {editingOperation?.partId === part.id && (
                  <div className="border rounded-lg p-3 bg-blue-50 mb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("operations.operationName")} *</Label>
                        <Input
                          value={editingOperation.operation.operation_name || ""}
                          onChange={(e) =>
                            setEditingOperation({
                              ...editingOperation,
                              operation: { ...editingOperation.operation, operation_name: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("operations.cell")} *</Label>
                        <Select
                          value={editingOperation.operation.cell_id}
                          onValueChange={(value) =>
                            setEditingOperation({
                              ...editingOperation,
                              operation: { ...editingOperation.operation, cell_id: value },
                            })
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
                      <div>
                        <Label>{t("operations.estimatedTimeMinutes")}</Label>
                        <Input
                          type="number"
                          value={editingOperation.operation.estimated_time || ""}
                          onChange={(e) =>
                            setEditingOperation({
                              ...editingOperation,
                              operation: {
                                ...editingOperation.operation,
                                estimated_time: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("operations.sequence")}</Label>
                        <Input
                          type="number"
                          value={editingOperation.operation.sequence || 1}
                          onChange={(e) =>
                            setEditingOperation({
                              ...editingOperation,
                              operation: {
                                ...editingOperation.operation,
                                sequence: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleAddOperation(part.id)}>
                        <Save className="h-4 w-4 mr-2" /> {t("operations.saveOperation")}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingOperation(null)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Operations List */}
                <div className="space-y-2">
                  {part.operations.map((operation) => (
                    <div
                      key={operation.id}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <span className="font-medium">{operation.operation_name}</span>
                        <span className="text-sm text-gray-600 ml-3">
                          {t("operations.seq")}: {operation.sequence}
                          {operation.estimated_time && ` | ${t("operations.est")}: ${operation.estimated_time}${t("operations.min")}`}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setParts(
                            parts.map((p) =>
                              p.id === part.id
                                ? {
                                  ...p,
                                  operations: p.operations.filter((o) => o.id !== operation.id),
                                }
                                : p
                            )
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {part.operations.length === 0 && (
                    <p className="text-sm text-gray-500 italic">{t("operations.noOperationsYet")}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary */}
      {step === 4 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("jobs.step4ReviewCreate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{t("jobs.jobDetails")}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">{t("jobs.jobNumber")}:</span> {jobNumber}
                </div>
                <div>
                  <span className="font-medium">{t("jobs.customer")}:</span> {customer}
                </div>
                <div>
                  <span className="font-medium">{t("jobs.dueDate")}:</span> {dueDate}
                </div>
                <div>
                  <span className="font-medium">{t("jobs.parts")}:</span> {parts.length}
                </div>
                <div>
                  <span className="font-medium">{t("jobs.totalOperations")}:</span>{" "}
                  {parts.reduce((sum, part) => sum + part.operations.length, 0)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">{t("jobs.partsOperationsSummary")}</h3>
              {parts.map((part) => (
                <div key={part.id} className="border rounded-lg p-3 mb-2">
                  <h4 className="font-semibold">{part.part_number}</h4>
                  <p className="text-sm text-gray-600">
                    {part.material} | {part.operations.length} {t("operations.operations")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
        </Button>

        {step < 4 ? (
          <Button onClick={handleNext}>
            {t("common.next")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => createJobMutation.mutate()}
            disabled={createJobMutation.isPending}
            className="cta-button"
          >
            <Check className="mr-2 h-4 w-4" />
            {createJobMutation.isPending ? t("jobs.creating") : t("jobs.createJob")}
          </Button>
        )}
      </div>
    </div>
  );
}
