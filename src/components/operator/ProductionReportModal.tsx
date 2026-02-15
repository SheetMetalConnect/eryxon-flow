import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Minus, Plus, AlertTriangle, Trash2, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRecordProduction } from "@/hooks/useProductionMetrics";

interface ScrapReasonEntry {
  reasonId: string;
  quantity: number;
  notes: string;
}

interface ScrapReason {
  id: string;
  code: string;
  description: string;
  category: string;
}

interface ProductionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationName: string;
  partNumber: string;
  plannedQuantity?: number;
  onSuccess: (quantityGood: number, shouldStopTime: boolean) => void;
  onFileIssue?: () => void;
}

export default function ProductionReportModal({
  isOpen,
  onClose,
  operationId,
  operationName,
  partNumber,
  plannedQuantity,
  onSuccess,
  onFileIssue,
}: ProductionReportModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { recordQuantity } = useRecordProduction();

  const [quantityGood, setQuantityGood] = useState<number>(0);
  const [quantityRework, setQuantityRework] = useState<number>(0);
  const [scrapEntries, setScrapEntries] = useState<ScrapReasonEntry[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previouslyRecordedGood, setPreviouslyRecordedGood] = useState<number>(0);
  const [showShortfallPrompt, setShowShortfallPrompt] = useState(false);
  const [scrapReasons, setScrapReasons] = useState<ScrapReason[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate totals
  const totalScrap = scrapEntries.reduce((sum, e) => sum + e.quantity, 0);
  const totalGoodAfter = previouslyRecordedGood + quantityGood;
  const remaining = plannedQuantity ? Math.max(0, plannedQuantity - totalGoodAfter) : 0;
  const targetAchieved = plannedQuantity ? totalGoodAfter >= plannedQuantity : false;
  const hasShortfall = plannedQuantity ? totalGoodAfter < plannedQuantity : false;

  useEffect(() => {
    if (isOpen) {
      fetchPreviousQuantities();
      fetchScrapReasons();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setQuantityGood(0);
    setQuantityRework(0);
    setScrapEntries([]);
    setNotes("");
    setShowShortfallPrompt(false);
    setShowAdvanced(false);
  };

  const fetchPreviousQuantities = async () => {
    try {
      const { data, error } = await supabase
        .from("operation_quantities")
        .select("quantity_good")
        .eq("operation_id", operationId);
      if (error) throw error;
      const totalGood = data?.reduce((sum, rec) => sum + (rec.quantity_good || 0), 0) || 0;
      setPreviouslyRecordedGood(totalGood);
    } catch (error) {
      console.error("Error fetching previous quantities:", error);
    }
  };

  const fetchScrapReasons = async () => {
    try {
      const { data, error } = await supabase
        .from("scrap_reasons")
        .select("id, code, description, category")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      setScrapReasons(data || []);
    } catch (error) {
      console.error("Error fetching scrap reasons:", error);
    }
  };

  const addScrapEntry = () => {
    setScrapEntries([...scrapEntries, { reasonId: "", quantity: 1, notes: "" }]);
    setShowAdvanced(true);
  };

  const removeScrapEntry = (index: number) => {
    setScrapEntries(scrapEntries.filter((_, i) => i !== index));
  };

  const updateScrapEntry = (index: number, field: keyof ScrapReasonEntry, value: string | number) => {
    const updated = [...scrapEntries];
    updated[index] = { ...updated[index], [field]: value };
    setScrapEntries(updated);
  };

  const increment = () => setQuantityGood((q) => q + 1);
  const decrement = () => setQuantityGood((q) => Math.max(0, q - 1));

  const handleSubmit = async (fileIssue: boolean = false) => {
    if (quantityGood <= 0 && totalScrap <= 0 && quantityRework <= 0) {
      toast.error(t("production.enterQuantity", "Enter at least one quantity"));
      return;
    }
    if (!profile?.tenant_id) {
      toast.error(t("notifications.noTenantFound"));
      return;
    }

    // Validate scrap entries have reasons selected
    const invalidScrap = scrapEntries.some((e) => e.quantity > 0 && !e.reasonId);
    if (invalidScrap) {
      toast.error(t("production.selectScrapReason", "Select a reason for each scrap entry"));
      return;
    }

    // If there's a shortfall and we haven't asked yet, ask
    if (hasShortfall && !showShortfallPrompt && quantityGood > 0) {
      setShowShortfallPrompt(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await recordQuantity({
        operationId,
        quantityGood,
        quantityScrap: totalScrap,
        quantityRework,
        scrapReasons: scrapEntries.filter((e) => e.reasonId && e.quantity > 0),
        notes: notes || undefined,
      });

      toast.success(
        t("production.recorded", "{{good}} good, {{scrap}} scrap recorded", {
          good: quantityGood,
          scrap: totalScrap,
        })
      );

      // Open issue form if requested
      if (fileIssue && onFileIssue) {
        onFileIssue();
      }

      onSuccess(quantityGood, targetAchieved);
      handleClose();
    } catch (error: any) {
      console.error("Error recording production:", error);
      toast.error(error.message || t("notifications.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("production.reportTitle", "Report Production")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
          {/* Part info */}
          <div className="text-center text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{partNumber}</div>
            {plannedQuantity && (
              <div>
                {t("production.target", "Target")}: {plannedQuantity}
                {previouslyRecordedGood > 0 && (
                  <span className="ml-1">
                    ({previouslyRecordedGood} {t("production.done", "done")})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Good quantity counter */}
          <div className="space-y-2">
            <Label className="text-center block">{t("production.goodParts", "Good Parts")}</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full text-xl"
                onClick={decrement}
                disabled={quantityGood <= 0}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <div className="text-4xl font-bold w-20 text-center tabular-nums">{quantityGood}</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full text-xl"
                onClick={increment}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Status indicator */}
          {quantityGood > 0 && (
            <div className="text-center text-sm">
              {targetAchieved ? (
                <span className="text-green-600 flex items-center justify-center gap-1">
                  <Check className="h-4 w-4" />
                  {t("production.targetReached", "Target reached!")}
                </span>
              ) : plannedQuantity ? (
                <span className="text-muted-foreground">
                  {remaining} {t("production.remaining", "remaining")}
                </span>
              ) : null}
            </div>
          )}

          {/* Advanced: Scrap and Rework */}
          {!showAdvanced && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setShowAdvanced(true)}
            >
              {t("production.addScrapRework", "Add scrap or rework...")}
            </Button>
          )}

          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Rework quantity */}
              <div className="flex items-center justify-between">
                <Label>{t("production.rework", "Rework")}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantityRework((q) => Math.max(0, q - 1))}
                    disabled={quantityRework <= 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center tabular-nums">{quantityRework}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantityRework((q) => q + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Scrap entries with reasons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("production.scrap", "Scrap")}</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addScrapEntry}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    {t("production.addReason", "Add reason")}
                  </Button>
                </div>

                {scrapEntries.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <Select
                      value={entry.reasonId}
                      onValueChange={(value) => updateScrapEntry(index, "reasonId", value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t("production.selectReason", "Select reason...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {scrapReasons.map((reason) => (
                          <SelectItem key={reason.id} value={reason.id}>
                            <span className="font-mono text-xs mr-2">{reason.code}</span>
                            {reason.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateScrapEntry(index, "quantity", Math.max(1, entry.quantity - 1))}
                        disabled={entry.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center tabular-nums text-sm">{entry.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateScrapEntry(index, "quantity", entry.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeScrapEntry(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {totalScrap > 0 && (
                  <div className="text-sm text-muted-foreground text-right">
                    {t("production.totalScrap", "Total scrap")}: {totalScrap}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t("production.notes", "Notes")}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("production.notesPlaceholder", "Optional notes...")}
                  className="h-16"
                />
              </div>
            </div>
          )}

          {/* Shortfall prompt */}
          {showShortfallPrompt && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                {t("production.shortfallPrompt", "{{count}} short of target. File an issue?", {
                  count: remaining,
                })}
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                  {t("common.no", "No")}
                </Button>
                <Button variant="default" size="sm" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
                  {t("common.yes", "Yes")}
                </Button>
              </div>
            </Alert>
          )}
        </div>

        {!showShortfallPrompt && (
          <div className="shrink-0 flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || (quantityGood <= 0 && totalScrap <= 0 && quantityRework <= 0)}
              size="lg"
            >
              {isSubmitting ? t("common.saving", "Saving...") : t("production.report", "Report")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
