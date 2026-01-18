import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateBatch, useGroupableOperations } from "@/hooks/useBatches";
import type { BatchType, NestingMetadata, GroupableOperation } from "@/types/batches";
import { BATCH_TYPE_CONFIG } from "@/types/batches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Zap,
  Cylinder,
  Scissors,
  Sparkles,
  Layers,
  CheckCircle2,
  Package,
} from "lucide-react";

interface CreateBatchModalProps {
  open: boolean;
  onClose: () => void;
  preselectedCellId?: string;
  preselectedOperationIds?: string[];
}

const BATCH_TYPE_ICONS: Record<BatchType, React.ElementType> = {
  laser_nesting: Zap,
  tube_batch: Cylinder,
  saw_batch: Scissors,
  finishing_batch: Sparkles,
  general: Layers,
};

export default function CreateBatchModal({
  open,
  onClose,
  preselectedCellId,
  preselectedOperationIds,
}: CreateBatchModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"type" | "cell" | "operations" | "details">("type");
  const [batchType, setBatchType] = useState<BatchType | null>(null);
  const [cellId, setCellId] = useState<string>(preselectedCellId || "");
  const [selectedOperationIds, setSelectedOperationIds] = useState<string[]>(preselectedOperationIds || []);
  const [notes, setNotes] = useState("");
  const [efficiency, setEfficiency] = useState<string>("");

  const createBatch = useCreateBatch();

  // Fetch cells
  const { data: cells } = useQuery({
    queryKey: ["cells"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("id, name")
        .eq("active", true)
        .order("sequence");
      if (error) throw error;
      return data || [];
    },
  });

  // Get groupable operations
  const { data: groupableData, isLoading: loadingOperations } = useGroupableOperations(cellId || undefined);

  // Calculate selected operations summary
  const selectedSummary = useMemo(() => {
    if (!groupableData?.operations) return null;
    const selected = groupableData.operations.filter(op => selectedOperationIds.includes(op.id));
    if (selected.length === 0) return null;

    const materials = new Set(selected.map(op => op.material));
    const thicknesses = new Set(selected.map(op => op.thickness_mm).filter(t => t !== null));
    const jobs = new Set(selected.map(op => op.job_number));
    const totalTime = selected.reduce((sum, op) => sum + op.estimated_time, 0);

    return {
      count: selected.length,
      materials: Array.from(materials),
      thicknesses: Array.from(thicknesses),
      jobs: Array.from(jobs),
      totalTime,
      // For batch creation, use the most common material/thickness
      primaryMaterial: selected[0]?.material || null,
      primaryThickness: selected[0]?.thickness_mm || null,
    };
  }, [groupableData?.operations, selectedOperationIds]);

  const handleSelectGroup = (operations: GroupableOperation[]) => {
    const ids = operations.map(op => op.id);
    setSelectedOperationIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !ids.includes(id));
      } else {
        return [...new Set([...prev, ...ids])];
      }
    });
  };

  const handleToggleOperation = (id: string) => {
    setSelectedOperationIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!batchType || !cellId || selectedOperationIds.length === 0) return;

    const nestingMetadata: NestingMetadata | undefined = efficiency
      ? { efficiency_percent: parseFloat(efficiency) }
      : undefined;

    await createBatch.mutateAsync({
      batch_type: batchType,
      cell_id: cellId,
      material: selectedSummary?.primaryMaterial || undefined,
      thickness_mm: selectedSummary?.primaryThickness || undefined,
      notes: notes || undefined,
      nesting_metadata: nestingMetadata,
      operation_ids: selectedOperationIds,
    });

    handleClose();
  };

  const handleClose = () => {
    setStep("type");
    setBatchType(null);
    setCellId(preselectedCellId || "");
    setSelectedOperationIds(preselectedOperationIds || []);
    setNotes("");
    setEfficiency("");
    onClose();
  };

  const canProceed = () => {
    switch (step) {
      case "type":
        return !!batchType;
      case "cell":
        return !!cellId;
      case "operations":
        return selectedOperationIds.length > 0;
      case "details":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case "type":
        setStep("cell");
        break;
      case "cell":
        setStep("operations");
        break;
      case "operations":
        setStep("details");
        break;
      case "details":
        handleCreate();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case "cell":
        setStep("type");
        break;
      case "operations":
        setStep("cell");
        break;
      case "details":
        setStep("operations");
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("batches.createBatch")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Select Batch Type */}
          {step === "type" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("batches.selectBatchType")}</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(BATCH_TYPE_CONFIG) as BatchType[]).map((type) => {
                  const config = BATCH_TYPE_CONFIG[type];
                  const Icon = BATCH_TYPE_ICONS[type];
                  const isSelected = batchType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setBatchType(type)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-brand-primary bg-brand-primary/10"
                          : "border-border hover:border-brand-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isSelected ? "text-brand-primary" : "text-muted-foreground"}`} />
                        <div>
                          <div className="font-medium">{t(`batches.types.${type}`)}</div>
                          <div className="text-xs text-muted-foreground">{t(`batches.typeDescriptions.${type}`)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Select Cell */}
          {step === "cell" && (
            <div className="space-y-4">
              <Label>{t("batches.selectCell")}</Label>
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
          )}

          {/* Step 3: Select Operations */}
          {step === "operations" && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Label>{t("batches.selectOperations")}</Label>
                {selectedSummary && (
                  <Badge variant="outline">
                    {selectedSummary.count} {t("batches.operationsCount").toLowerCase()}
                  </Badge>
                )}
              </div>

              {loadingOperations ? (
                <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
              ) : !groupableData?.materialGroups?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("batches.noOperationsInBatch")}
                </div>
              ) : (
                <ScrollArea className="flex-1 max-h-[400px]">
                  <Accordion type="multiple" className="w-full">
                    {groupableData.materialGroups.map((group, idx) => {
                      const groupOperationIds = group.operations.map(op => op.id);
                      const selectedInGroup = groupOperationIds.filter(id => selectedOperationIds.includes(id)).length;
                      const allSelected = selectedInGroup === group.operations.length;

                      return (
                        <AccordionItem key={idx} value={`group-${idx}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={() => handleSelectGroup(group.operations)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="font-medium">{group.material}</span>
                                {group.thickness_mm && (
                                  <Badge variant="secondary" className="text-xs">
                                    {group.thickness_mm}mm
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline">
                                {selectedInGroup}/{group.operations.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pl-6">
                              {group.operations.map((op) => (
                                <div
                                  key={op.id}
                                  className="flex items-center gap-3 p-2 rounded border border-border/50 hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={selectedOperationIds.includes(op.id)}
                                    onCheckedChange={() => handleToggleOperation(op.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm truncate">
                                        {op.part_number}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {op.operation_name}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {op.job_number} {op.customer && `• ${op.customer}`}
                                    </div>
                                  </div>
                                  {op.quantity && (
                                    <Badge variant="secondary" className="text-xs">
                                      x{op.quantity}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Step 4: Details & Confirm */}
          {step === "details" && (
            <div className="space-y-4">
              {/* Summary */}
              {selectedSummary && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedSummary.count} {t("batches.operationsCount").toLowerCase()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSummary.materials.join(", ")}
                    {selectedSummary.thicknesses.length > 0 && (
                      <> • {selectedSummary.thicknesses.join(", ")}mm</>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("batches.estimatedTime")}: {Math.round(selectedSummary.totalTime)} min
                  </div>
                </div>
              )}

              <Separator />

              {/* Optional: Nesting Efficiency */}
              {(batchType === "laser_nesting" || batchType === "tube_batch") && (
                <div className="space-y-2">
                  <Label>{t("batches.nesting.efficiency")} (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={efficiency}
                    onChange={(e) => setEfficiency(e.target.value)}
                    placeholder="e.g. 85"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t("batches.notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("batches.notesPlaceholder")}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step !== "type" && (
              <Button variant="outline" onClick={handleBack}>
                {t("common.back")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createBatch.isPending}
              className="cta-button"
            >
              {step === "details" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {createBatch.isPending ? "Creating..." : t("batches.createBatch")}
                </>
              ) : (
                t("common.next")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
