import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { AlertTriangle, Check, Loader2, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";

interface ProductionQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationName: string;
  partNumber: string;
  plannedQuantity?: number;
  onSuccess: (quantityGood: number, completeAfterReport: boolean) => void | Promise<void>;
  onFileIssue?: (shortfallQuantity: number) => void;
  allowComplete?: boolean;
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
  allowComplete = false,
}: ProductionQuantityModalProps) {
  const { t } = useTranslation();
  const profile = useProfile();

  const [quantityGood, setQuantityGood] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previouslyRecordedGood, setPreviouslyRecordedGood] = useState<number>(0);
  const [showShortfallPrompt, setShowShortfallPrompt] = useState(false);

  const totalGoodAfter = previouslyRecordedGood + quantityGood;
  const remaining = plannedQuantity ? Math.max(0, plannedQuantity - totalGoodAfter) : 0;
  const targetAchieved = plannedQuantity ? totalGoodAfter >= plannedQuantity : false;
  const hasShortfall = plannedQuantity ? totalGoodAfter < plannedQuantity : false;
  const quantityProgress = plannedQuantity
    ? Math.min(100, Math.round((totalGoodAfter / plannedQuantity) * 100))
    : 0;

  const fetchPreviousQuantities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("operation_quantities")
        .select("quantity_good")
        .eq("operation_id", operationId);
      if (error) throw error;
      const totalGood = data?.reduce((sum, rec) => sum + (rec.quantity_good || 0), 0) || 0;
      setPreviouslyRecordedGood(totalGood);
    } catch (error) {
      logger.error("ProductionQuantityModal", "Error fetching previous quantities", error);
    }
  }, [operationId]);

  useEffect(() => {
    if (isOpen) {
      void fetchPreviousQuantities();
      setQuantityGood(0);
      setShowShortfallPrompt(false);
    }
  }, [fetchPreviousQuantities, isOpen]);

  const increment = () => setQuantityGood(q => q + 1);
  const decrement = () => setQuantityGood(q => Math.max(0, q - 1));

  const handleSubmit = async (fileIssue = false, completeAfterReport = false) => {
    if (quantityGood <= 0) {
      toast.error(t("production.enterGoodParts"));
      return;
    }
    if (!profile?.tenant_id) {
      toast.error(t("notifications.noTenantFound"));
      return;
    }

    if (hasShortfall && !showShortfallPrompt && quantityGood > 0) {
      setShowShortfallPrompt(true);
      return;
    }

    setIsSubmitting(true);
    try {
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

      toast.success(t("production.recorded", { count: quantityGood }));

      if (fileIssue && onFileIssue) {
        onFileIssue(remaining);
      }

      await onSuccess(quantityGood, completeAfterReport);
      handleClose();
    } catch (error: unknown) {
      logger.error("ProductionQuantityModal", "Error recording production", error);
      toast.error(error instanceof Error ? error.message : t("notifications.failed"));
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
          <DialogTitle>{t("production.reportTitle")}</DialogTitle>
          <DialogDescription>{t("production.reportDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{operationName}</div>
            <div className="font-mono text-xs">{partNumber}</div>
            {plannedQuantity && (
              <div>
                {t("production.target")}: {plannedQuantity}
                {previouslyRecordedGood > 0 && (
                  <span className="ml-1">({previouslyRecordedGood} {t("production.done")})</span>
                )}
              </div>
            )}
          </div>

          {plannedQuantity ? (
            <div className="space-y-1.5" aria-label={t("production.quantityProgress", { count: quantityProgress })}>
              <Progress value={quantityProgress} className="h-2 bg-muted" />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>{totalGoodAfter} / {plannedQuantity}</span>
                <span>{quantityProgress}%</span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full text-2xl"
              onClick={decrement}
              disabled={quantityGood <= 0}
              aria-label={t("production.decreaseQuantity")}
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
              aria-label={t("production.increaseQuantity")}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>

          {quantityGood > 0 && (
            <div className="text-center text-sm">
              {targetAchieved ? (
                <span className="text-green-600 flex items-center justify-center gap-1">
                  <Check className="h-4 w-4" />
                  {t("production.targetReached")}
                </span>
              ) : plannedQuantity ? (
                <span className="text-muted-foreground">
                  {remaining} {t("production.remaining")}
                </span>
              ) : null}
            </div>
          )}

          {showShortfallPrompt && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                {t("production.shortfallPrompt", { count: remaining })}
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                >
                  {t("common.no")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  {t("common.yes")}
                </Button>
              </div>
            </Alert>
          )}
        </div>

        {!showShortfallPrompt ? (
          <div className="grid gap-2 pt-2 sm:grid-cols-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            {targetAchieved && allowComplete ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false, false)}
                  disabled={isSubmitting || quantityGood <= 0}
                >
                  {t("production.reportOnly")}
                </Button>
                <Button
                  onClick={() => handleSubmit(false, true)}
                  disabled={isSubmitting || quantityGood <= 0}
                  className="bg-emerald-600 text-white transition-colors hover:bg-emerald-700 motion-reduce:transition-none sm:col-span-2"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {isSubmitting ? t("common.saving") : t("production.reportAndComplete")}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleSubmit(false, false)}
                disabled={isSubmitting || quantityGood <= 0}
                size="lg"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? t("common.saving") : t("production.report")}
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
