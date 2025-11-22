import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Check } from "lucide-react";

interface ProductionQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationName: string;
  partNumber: string;
  plannedQuantity?: number;
  onSuccess: () => void;
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
  quantity_scrap:number;
  quantity_rework: number;
  scrap_reason_id: string;
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
  const [formData, setFormData] = useState<FormData>({
    quantity_produced: 0,
    quantity_good: 0,
    quantity_scrap: 0,
    quantity_rework: 0,
    scrap_reason_id: "",
    material_lot: "",
    notes: "",
  });

  const [scrapReasons, setScrapReasons] = useState<ScrapReason[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchScrapReasons();
    }
  }, [isOpen]);

  useEffect(() => {
    const { quantity_produced, quantity_good, quantity_scrap } = formData;
    const calculatedRework = quantity_produced - quantity_good - quantity_scrap;
    if (calculatedRework >= 0 && calculatedRework !== formData.quantity_rework) {
      setFormData((prev) => ({ ...prev, quantity_rework: calculatedRework }));
    }
  }, [formData.quantity_produced, formData.quantity_good, formData.quantity_scrap]);

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
    const { quantity_produced, quantity_good, quantity_scrap, quantity_rework, scrap_reason_id } = formData;
    if (quantity_produced !== quantity_good + quantity_scrap + quantity_rework) {
      setValidationError("Produced must equal Good + Scrap + Rework");
      return false;
    }
    if (quantity_scrap > 0 && !scrap_reason_id) {
      setValidationError("Scrap reason is required when scrap quantity > 0");
      return false;
    }
    if (quantity_produced < 0 || quantity_good < 0 || quantity_scrap < 0 || quantity_rework < 0) {
      setValidationError("Quantities cannot be negative");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("operation_quantities").insert({
        operation_id: operationId,
        quantity_produced: formData.quantity_produced,
        quantity_good: formData.quantity_good,
        quantity_scrap: formData.quantity_scrap,
        quantity_rework: formData.quantity_rework,
        scrap_reason_id: formData.scrap_reason_id || null,
        material_lot: formData.material_lot || null,
        notes: formData.notes || null,
        recorded_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      const yieldPercentage = formData.quantity_produced > 0
        ? ((formData.quantity_good / formData.quantity_produced) * 100).toFixed(1)
        : "0";
      toast.success(`Production recorded: ${formData.quantity_good} good parts (${yieldPercentage}% yield)`);
      onSuccess();
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
      quantity_scrap: 0,
      quantity_rework: 0,
      scrap_reason_id: "",
      material_lot: "",
      notes: "",
    });
    setValidationError(null);
    onClose();
  };

  const sum = formData.quantity_good + formData.quantity_scrap + formData.quantity_rework;
  const sumMatches = sum === formData.quantity_produced;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Production - {operationName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg text-sm">
            <div><strong>Part:</strong> {partNumber}</div>
            {plannedQuantity && <div><strong>Planned Qty:</strong> {plannedQuantity}</div>}
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="produced">Quantity Produced *</Label>
              <Input id="produced" type="number" min="0" value={formData.quantity_produced}
                onChange={(e) => setFormData({ ...formData, quantity_produced: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="good">• Good</Label>
                <Input id="good" type="number" min="0" value={formData.quantity_good}
                  onChange={(e) => setFormData({ ...formData, quantity_good: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="scrap">• Scrap</Label>
                <Input id="scrap" type="number" min="0" value={formData.quantity_scrap}
                  onChange={(e) => setFormData({ ...formData, quantity_scrap: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="rework">• Rework</Label>
                <Input id="rework" type="number" min="0" value={formData.quantity_rework}
                  onChange={(e) => setFormData({ ...formData, quantity_rework: parseInt(e.target.value) || 0 })} className="mt-1" disabled />
              </div>
            </div>
            <div className={`text-sm flex items-center gap-2 ${sumMatches ? "text-green-600" : "text-amber-600"}`}>
              {sumMatches ? (
                <>
                  <Check className="h-4 w-4" />
                  Sum matches produced ({sum})
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Sum ({sum}) must equal produced ({formData.quantity_produced})
                </>
              )}
            </div>
          </div>
          {formData.quantity_scrap > 0 && (
            <div>
              <Label htmlFor="scrap-reason">Scrap Reason *</Label>
              <Select value={formData.scrap_reason_id} onValueChange={(value) => setFormData({ ...formData, scrap_reason_id: value })}>
                <SelectTrigger id="scrap-reason" className="mt-1">
                  <SelectValue placeholder="Select scrap reason" />
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
          <div>
            <Label htmlFor="material-lot">Material Lot (Optional)</Label>
            <Input id="material-lot" value={formData.material_lot}
              onChange={(e) => setFormData({ ...formData, material_lot: e.target.value })}
              placeholder="e.g., LOT-2024-1234" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..." rows={2} className="mt-1" />
          </div>
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !sumMatches}>
            {isSubmitting ? "Recording..." : "Record Production"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
