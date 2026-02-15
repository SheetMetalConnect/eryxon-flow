import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Minus, Plus, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProductionQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationName: string;
  partNumber: string;
  plannedQuantity?: number;
  onSuccess: (quantityGood: number, shouldStopTime: boolean) => void;
  onFileIssue?: (shortfallQuantity: number) => void;
}

export default function ProductionQuantityModal({
  isOpen,
  onClose,
  operationId,
  operationName,
  partNumber,
  plannedQuantity,
  onSuccess,
  onFileIssue,
}: ProductionQuantityModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [quantityGood, setQuantityGood] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previouslyRecordedGood, setPreviouslyRecordedGood] = useState<number>(0);
  const [showShortfallPrompt, setShowShortfallPrompt] = useState(false);

  // Calculate totals
  const totalGoodAfter = previouslyRecordedGood + quantityGood;
  const remaining = plannedQuantity ? Math.max(0, plannedQuantity - totalGoodAfter) : 0;
  const targetAchieved = plannedQuantity ? totalGoodAfter >= plannedQuantity : false;
  const hasShortfall = plannedQuantity ? totalGoodAfter < plannedQuantity : false;

  useEffect(() => {
    if (isOpen) {
      fetchPreviousQuantities();
      setQuantityGood(0);
      setShowShortfallPrompt(false);
    }
  }, [isOpen]);

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

  const increment = () => setQuantityGood(q => q + 1);
  const decrement = () => setQuantityGood(q => Math.max(0, q - 1));

  const handleSubmit = async (fileIssue: boolean = false) => {
    if (quantityGood <= 0) {
      toast.error(t("production.enterGoodParts", "Enter good parts made"));
      return;
    }
    if (!profile?.tenant_id) {
      toast.error(t("notifications.noTenantFound"));
      return;
    }

    // If there's a shortfall and we haven't asked yet, ask
    if (hasShortfall && !showShortfallPrompt && quantityGood > 0) {
      setShowShortfallPrompt(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Only record what was actually made as good parts
      // Shortfall is remaining work, NOT scrap
      // Scrap should only be recorded when parts were made but failed quality
      const { error } = await supabase.from("operation_quantities").insert([{
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        quantity_produced: quantityGood,
        quantity_good: quantityGood,
        quantity_scrap: 0,
        quantity_rework: 0,
        recorded_at: new Date().toISOString(),
      }]);
      if (error) throw error;

      toast.success(t("production.recorded", "{{count}} good parts recorded", { count: quantityGood }));

      // Open issue form if requested with shortfall quantity
      if (fileIssue && onFileIssue) {
        onFileIssue(remaining);
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
    setQuantityGood(0);
    setShowShortfallPrompt(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("production.reportTitle", "Report Production")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Part info */}
          <div className="text-center text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{partNumber}</div>
            {plannedQuantity && (
              <div>
                {t("production.target", "Target")}: {plannedQuantity}
                {previouslyRecordedGood > 0 && (
                  <span className="ml-1">({previouslyRecordedGood} {t("production.done", "done")})</span>
                )}
              </div>
            )}
          </div>

          {/* Counter */}
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full text-2xl"
              onClick={decrement}
              disabled={quantityGood <= 0}
            >
              <Minus className="h-6 w-6" />
            </Button>
            <div className="text-5xl font-bold w-24 text-center tabular-nums">
              {quantityGood}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full text-2xl"
              onClick={increment}
            >
              <Plus className="h-6 w-6" />
            </Button>
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

          {/* Shortfall prompt */}
          {showShortfallPrompt && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                {t("production.shortfallPrompt", "{{count}} short of target. File an issue?", { count: remaining })}
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                >
                  {t("common.no", "No")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  {t("common.yes", "Yes")}
                </Button>
              </div>
            </Alert>
          )}
        </div>

        {!showShortfallPrompt && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || quantityGood <= 0}
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
