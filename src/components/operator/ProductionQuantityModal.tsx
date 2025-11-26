import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Check, Clock, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProductionQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationName: string;
  partNumber: string;
  plannedQuantity?: number;
  onSuccess: (quantityGood: number, shouldStopTime: boolean) => void;
}

interface ScrapReason {
  id: string;
  code: string;
  description: string;
  category: string;
}

type ShortfallChoice = "continuing" | "scrap" | "rework" | null;

export default function ProductionQuantityModal({
  isOpen,
  onClose,
  operationId,
  operationName,
  partNumber,
  plannedQuantity,
  onSuccess,
}: ProductionQuantityModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [quantityGood, setQuantityGood] = useState<number>(0);
  const [shortfallChoice, setShortfallChoice] = useState<ShortfallChoice>(null);
  const [scrapReasonId, setScrapReasonId] = useState<string>("");
  const [scrapReasons, setScrapReasons] = useState<ScrapReason[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previouslyRecordedGood, setPreviouslyRecordedGood] = useState<number>(0);

  // Calculate remaining and shortfall
  const remaining = plannedQuantity ? Math.max(0, plannedQuantity - previouslyRecordedGood) : 0;
  const shortfall = remaining > 0 ? Math.max(0, remaining - quantityGood) : 0;
  const hasShortfall = quantityGood > 0 && shortfall > 0;
  const quantityAchieved = plannedQuantity ? (previouslyRecordedGood + quantityGood) >= plannedQuantity : false;

  useEffect(() => {
    if (isOpen) {
      fetchScrapReasons();
      fetchPreviousQuantities();
    }
  }, [isOpen]);

  // Reset shortfall choice when quantity changes
  useEffect(() => {
    setShortfallChoice(null);
    setScrapReasonId("");
  }, [quantityGood]);

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
        .select("*")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      setScrapReasons(data || []);
    } catch (error) {
      console.error("Error fetching scrap reasons:", error);
    }
  };

  const validate = (): boolean => {
    if (quantityGood <= 0) {
      setValidationError(t("production.enterGoodParts", "Enter good parts made"));
      return false;
    }
    if (hasShortfall && !shortfallChoice) {
      setValidationError(t("production.selectShortfallChoice", "Select what happened to remaining parts"));
      return false;
    }
    if (shortfallChoice === "scrap" && !scrapReasonId) {
      setValidationError(t("production.selectScrapReason", "Select scrap reason"));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!profile?.tenant_id) {
      toast.error("No tenant found");
      return;
    }
    setIsSubmitting(true);
    try {
      const scrapQty = shortfallChoice === "scrap" ? shortfall : 0;
      const reworkQty = shortfallChoice === "rework" ? shortfall : 0;
      const producedQty = quantityGood + scrapQty + reworkQty;

      const { error } = await supabase.from("operation_quantities").insert([{
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        quantity_produced: producedQty,
        quantity_good: quantityGood,
        quantity_scrap: scrapQty,
        quantity_rework: reworkQty,
        scrap_reason_id: scrapReasonId || null,
        recorded_at: new Date().toISOString(),
      }]);
      if (error) throw error;

      // Simple success message
      if (scrapQty > 0) {
        toast.success(t("production.recordedWithScrap", "{{good}} good, {{scrap}} scrap", { good: quantityGood, scrap: scrapQty }));
      } else if (reworkQty > 0) {
        toast.success(t("production.recordedWithRework", "{{good}} good, {{rework}} rework", { good: quantityGood, rework: reworkQty }));
      } else {
        toast.success(t("production.recorded", "{{count}} good parts recorded", { count: quantityGood }));
      }

      onSuccess(quantityGood, quantityAchieved);
      handleClose();
    } catch (error: any) {
      console.error("Error recording production:", error);
      toast.error(error.message || "Failed to record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuantityGood(0);
    setShortfallChoice(null);
    setScrapReasonId("");
    setValidationError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("production.reportTitle", "Report Production")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target info */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="font-medium">{partNumber}</div>
            {plannedQuantity && (
              <div className="text-muted-foreground mt-1">
                {t("production.target", "Target")}: {plannedQuantity}
                {previouslyRecordedGood > 0 && (
                  <span> ({remaining} {t("production.remaining", "remaining")})</span>
                )}
              </div>
            )}
          </div>

          {/* Single input: How many good parts? */}
          <div>
            <Label htmlFor="good" className="text-base font-medium">
              {t("production.goodPartsQuestion", "How many good parts?")}
            </Label>
            <Input
              id="good"
              type="number"
              min="0"
              value={quantityGood || ""}
              onChange={(e) => setQuantityGood(parseInt(e.target.value) || 0)}
              className="text-2xl h-14 mt-2 text-center font-bold"
              placeholder="0"
              autoFocus
            />
          </div>

          {/* Quantity achieved - green success */}
          {quantityAchieved && quantityGood > 0 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-500/10 p-3 rounded-lg">
              <Check className="h-5 w-5" />
              <span className="font-medium">{t("production.targetReached", "Target reached!")}</span>
            </div>
          )}

          {/* Shortfall question - only when there's a gap */}
          {hasShortfall && (
            <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {t("production.shortfallQuestion", "{{count}} remaining - what happened?", { count: shortfall })}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={shortfallChoice === "continuing" ? "default" : "outline"}
                  className="h-12 px-2"
                  onClick={() => {
                    setShortfallChoice("continuing");
                    setScrapReasonId("");
                  }}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {t("production.continuing", "Next shift")}
                </Button>
                <Button
                  type="button"
                  variant={shortfallChoice === "rework" ? "secondary" : "outline"}
                  className="h-12 px-2"
                  onClick={() => {
                    setShortfallChoice("rework");
                    setScrapReasonId("");
                  }}
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  {t("production.rework", "Rework")}
                </Button>
                <Button
                  type="button"
                  variant={shortfallChoice === "scrap" ? "destructive" : "outline"}
                  className="h-12 px-2"
                  onClick={() => setShortfallChoice("scrap")}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {t("production.scrap", "Scrap")}
                </Button>
              </div>

              {/* Scrap reason - only if scrap selected */}
              {shortfallChoice === "scrap" && (
                <div>
                  <Label htmlFor="scrap-reason">{t("production.why", "Why?")}</Label>
                  <Select value={scrapReasonId} onValueChange={setScrapReasonId}>
                    <SelectTrigger id="scrap-reason" className="mt-1">
                      <SelectValue placeholder={t("production.selectReason", "Select reason")} />
                    </SelectTrigger>
                    <SelectContent>
                      {scrapReasons.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.code}: {reason.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || quantityGood <= 0}
            size="lg"
          >
            {isSubmitting ? t("common.saving", "Saving...") : t("production.report", "Report")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
