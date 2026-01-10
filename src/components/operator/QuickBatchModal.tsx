import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCreateBatch, useGroupableOperations } from "@/hooks/useBatches";
import type { BatchType, GroupableOperation } from "@/types/batches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Package,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickBatchModalProps {
  open: boolean;
  onClose: () => void;
  cellId?: string;
  cellName?: string;
  onSuccess?: () => void;
}

const BATCH_TYPE_ICONS: Record<BatchType, React.ElementType> = {
  laser_nesting: Zap,
  tube_batch: Cylinder,
  saw_batch: Scissors,
  finishing_batch: Sparkles,
  general: Layers,
};

const BATCH_TYPES: { value: BatchType; label: string }[] = [
  { value: "laser_nesting", label: "batches.types.laser_nesting" },
  { value: "tube_batch", label: "batches.types.tube_batch" },
  { value: "saw_batch", label: "batches.types.saw_batch" },
  { value: "finishing_batch", label: "batches.types.finishing_batch" },
  { value: "general", label: "batches.types.general" },
];

export default function QuickBatchModal({
  open,
  onClose,
  cellId,
  cellName,
  onSuccess,
}: QuickBatchModalProps) {
  const { t } = useTranslation();
  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set());
  const [batchType, setBatchType] = useState<BatchType>("laser_nesting");

  const { data: groupableData, isLoading } = useGroupableOperations(cellId);
  const createBatch = useCreateBatch();

  // Filter material groups for the selected cell
  const materialGroups = useMemo(() => {
    if (!groupableData?.materialGroups || !cellId) return [];
    return groupableData.materialGroups.filter((g) => g.cell_id === cellId);
  }, [groupableData, cellId]);

  // Get selected operations info
  const selectedOperations = useMemo(() => {
    const ops: GroupableOperation[] = [];
    materialGroups.forEach((group) => {
      group.operations.forEach((op) => {
        if (selectedOps.has(op.id)) {
          ops.push(op);
        }
      });
    });
    return ops;
  }, [materialGroups, selectedOps]);

  // Get common material/thickness from selection
  const commonMaterial = useMemo(() => {
    if (selectedOperations.length === 0) return null;
    const materials = new Set(selectedOperations.map((op) => op.material));
    const thicknesses = new Set(
      selectedOperations.map((op) => op.thickness_mm)
    );
    if (materials.size === 1 && thicknesses.size === 1) {
      return {
        material: selectedOperations[0].material,
        thickness_mm: selectedOperations[0].thickness_mm,
      };
    }
    return null;
  }, [selectedOperations]);

  const handleToggleOperation = (opId: string) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      if (next.has(opId)) {
        next.delete(opId);
      } else {
        next.add(opId);
      }
      return next;
    });
  };

  const handleSelectGroup = (operations: GroupableOperation[]) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      const allSelected = operations.every((op) => next.has(op.id));
      if (allSelected) {
        operations.forEach((op) => next.delete(op.id));
      } else {
        operations.forEach((op) => next.add(op.id));
      }
      return next;
    });
  };

  const handleCreateBatch = async () => {
    if (!cellId || selectedOps.size === 0) return;

    await createBatch.mutateAsync({
      batch_type: batchType,
      cell_id: cellId,
      material: commonMaterial?.material,
      thickness_mm: commonMaterial?.thickness_mm ?? undefined,
      operation_ids: Array.from(selectedOps),
    });

    setSelectedOps(new Set());
    onSuccess?.();
    onClose();
  };

  const handleClose = () => {
    setSelectedOps(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-primary" />
            {t("batches.quickCreate")}
          </DialogTitle>
          <DialogDescription>
            {cellName
              ? t("batches.quickCreateForCell", { cell: cellName })
              : t("batches.quickCreateDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Batch Type Selection */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium">{t("batches.batchType")}:</label>
          <Select value={batchType} onValueChange={(v) => setBatchType(v as BatchType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BATCH_TYPES.map((type) => {
                const Icon = BATCH_TYPE_ICONS[type.value];
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {t(type.label)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Operations List */}
        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : materialGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t("batches.noGroupableOperations")}</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {materialGroups.map((group) => {
                const groupKey = `${group.material}|${group.thickness_mm}`;
                const allSelected = group.operations.every((op) =>
                  selectedOps.has(op.id)
                );
                const someSelected = group.operations.some((op) =>
                  selectedOps.has(op.id)
                );
                const selectedCount = group.operations.filter((op) =>
                  selectedOps.has(op.id)
                ).length;

                return (
                  <AccordionItem
                    key={groupKey}
                    value={groupKey}
                    className="border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                      <div className="flex items-center justify-between flex-1 mr-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={allSelected}
                            className={cn(someSelected && !allSelected && "opacity-50")}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectGroup(group.operations);
                            }}
                          />
                          <div className="text-left">
                            <div className="font-medium">
                              {group.material || t("batches.noMaterial")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {group.thickness_mm
                                ? `${group.thickness_mm}mm`
                                : t("batches.noThickness")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedCount > 0 && (
                            <Badge variant="default" className="bg-brand-primary">
                              {selectedCount} {t("common.selected")}
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            {group.operations.length} ops
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="space-y-1 pt-2">
                        {group.operations.map((op) => (
                          <div
                            key={op.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md cursor-pointer",
                              "hover:bg-muted/50 transition-colors",
                              selectedOps.has(op.id) && "bg-brand-primary/10"
                            )}
                            onClick={() => handleToggleOperation(op.id)}
                          >
                            <Checkbox checked={selectedOps.has(op.id)} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {op.part_number}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {op.job_number}
                                {op.customer && ` • ${op.customer}`}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div>x{op.quantity || 1}</div>
                              <div className="text-xs text-muted-foreground">
                                {op.estimated_time}min
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </ScrollArea>

        {/* Summary & Create Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            {selectedOps.size > 0 ? (
              <span>
                <strong>{selectedOps.size}</strong> {t("batches.operationsSelected")}
                {commonMaterial && (
                  <span className="text-muted-foreground ml-2">
                    ({commonMaterial.material}
                    {commonMaterial.thickness_mm && ` • ${commonMaterial.thickness_mm}mm`})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t("batches.selectOperationsToCreate")}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateBatch}
              disabled={selectedOps.size === 0 || createBatch.isPending}
              className="cta-button"
            >
              {createBatch.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.creating")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("batches.createBatch")} ({selectedOps.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
