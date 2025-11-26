import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Check } from "lucide-react";

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

interface FormData {
  quantity_produced: number;
  quantity_good: number;
  scrap_reason_id: string;
  scrap_confirmed: boolean;
  material_lot: string;
  notes: string;
}

export default function ProductionQuantityModal({
  isOpen,
  onClose,
  operationId,
  operationName,
  partNumber,
  plannedQuantity,
  onSuccess,
}: ProductionQuantityModalProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    quantity_produced: 0,
    quantity_good: 0,
    scrap_reason_id: "",
    scrap_confirmed: false,
    material_lot: "",
    notes: "",
  });

  const [scrapReasons, setScrapReasons] = useState<ScrapReason[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previouslyRecordedGood, setPreviouslyRecordedGood] = useState<number>(0);

  // Calculate scrap automatically
  const calculatedScrap = Math.max(0, formData.quantity_produced - formData.quantity_good);
  const hasScrap = calculatedScrap > 0;

  // Check if quantity will be achieved after this entry
  const totalGoodAfterEntry = previouslyRecordedGood + formData.quantity_good;
  const quantityAchieved = plannedQuantity ? totalGoodAfterEntry >= plannedQuantity : false;

  useEffect(() => {
    if (isOpen) {
      fetchScrapReasons();
      fetchPreviousQuantities();
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
      toast.error("Failed to load scrap reasons");
    }
  };

  const validate = (): boolean => {
    const { quantity_produced, quantity_good, scrap_reason_id, scrap_confirmed } = formData;

    if (quantity_produced <= 0) {
      setValidationError("Enter how many parts you produced");
      return false;
    }
    if (quantity_good < 0) {
      setValidationError("Good parts cannot be negative");
      return false;
    }
    if (quantity_good > quantity_produced) {
      setValidationError("Good parts cannot exceed produced");
      return false;
    }
    if (hasScrap && !scrap_reason_id) {
      setValidationError("Select a scrap reason");
      return false;
    }
    if (hasScrap && !scrap_confirmed) {
      setValidationError("Confirm the scrap before submitting");
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
      const { data, error } = await supabase.from("operation_quantities").insert([{
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        quantity_produced: formData.quantity_produced,
        quantity_good: formData.quantity_good,
        quantity_scrap: calculatedScrap,
        quantity_rework: 0,
        scrap_reason_id: formData.scrap_reason_id || null,
        material_lot: formData.material_lot || null,
        notes: formData.notes || null,
        recorded_at: new Date().toISOString(),
      }]).select().single();
      if (error) throw error;

      // Show success message
      if (hasScrap) {
        toast.success(`Recorded: ${formData.quantity_good} good, ${calculatedScrap} scrap`);
      } else {
        toast.success(`Recorded: ${formData.quantity_good} good parts`);
      }

      // Notify parent with quantity and whether to stop time
      onSuccess(formData.quantity_good, quantityAchieved);
      handleClose();
    } catch (error: any) {
      console.error("Error recording production:", error);
      toast.error(error.message || "Failed to record production");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      quantity_produced: 0,
      quantity_good: 0,
      scrap_reason_id: "",
      scrap_confirmed: false,
      material_lot: "",
      notes: "",
    });
    setValidationError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report Production</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Part info */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="flex justify-between">
              <span><strong>Part:</strong> {partNumber}</span>
              <span><strong>Op:</strong> {operationName}</span>
            </div>
            {plannedQuantity && (
              <div className="mt-1">
                <strong>Target:</strong> {plannedQuantity} pcs
                {previouslyRecordedGood > 0 && (
                  <span className="text-muted-foreground ml-2">
                    ({previouslyRecordedGood} already recorded)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Main inputs - simple and clear */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="produced" className="text-base font-medium">Parts Produced</Label>
              <p className="text-sm text-muted-foreground mb-2">How many parts did you make this run?</p>
              <Input
                id="produced"
                type="number"
                min="0"
                value={formData.quantity_produced || ""}
                onChange={(e) => setFormData({ ...formData, quantity_produced: parseInt(e.target.value) || 0 })}
                className="text-lg h-12"
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="good" className="text-base font-medium">Good Parts</Label>
              <p className="text-sm text-muted-foreground mb-2">How many are good quality?</p>
              <Input
                id="good"
                type="number"
                min="0"
                max={formData.quantity_produced}
                value={formData.quantity_good || ""}
                onChange={(e) => setFormData({ ...formData, quantity_good: parseInt(e.target.value) || 0 })}
                className="text-lg h-12"
                placeholder="0"
              />
            </div>
          </div>

          {/* Scrap display - only shows when there is scrap */}
          {formData.quantity_produced > 0 && hasScrap && (
            <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold text-lg">{calculatedScrap} Scrap</span>
              </div>

              <div>
                <Label htmlFor="scrap-reason">Why?</Label>
                <Select
                  value={formData.scrap_reason_id}
                  onValueChange={(value) => setFormData({ ...formData, scrap_reason_id: value })}
                >
                  <SelectTrigger id="scrap-reason" className="mt-1">
                    <SelectValue placeholder="Select reason" />
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

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="confirm-scrap"
                  checked={formData.scrap_confirmed}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, scrap_confirmed: checked === true })
                  }
                />
                <Label htmlFor="confirm-scrap" className="text-sm cursor-pointer">
                  I confirm {calculatedScrap} part{calculatedScrap > 1 ? "s are" : " is"} scrap
                </Label>
              </div>
            </div>
          )}

          {/* Success indicator when no scrap */}
          {formData.quantity_produced > 0 && !hasScrap && formData.quantity_good > 0 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-500/10 p-3 rounded-lg">
              <Check className="h-5 w-5" />
              <span className="font-medium">{formData.quantity_good} good parts - no scrap</span>
            </div>
          )}

          {/* Quantity achieved notification */}
          {quantityAchieved && formData.quantity_good > 0 && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Check className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700">
                Target quantity achieved! Time tracking will stop.
              </AlertDescription>
            </Alert>
          )}

          {/* Optional notes - collapsed by default */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Add notes or material lot (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="material-lot">Material Lot</Label>
                <Input
                  id="material-lot"
                  value={formData.material_lot}
                  onChange={(e) => setFormData({ ...formData, material_lot: e.target.value })}
                  placeholder="e.g., LOT-2024-1234"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </details>

          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || formData.quantity_produced <= 0}
          >
            {isSubmitting ? "Saving..." : "Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
