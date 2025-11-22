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
    quantity_scrap: number;
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
    const [formData, setFormData] = useState\u003cFormData\u003e({
        quantity_produced: 0,
        quantity_good: 0,
        quantity_scrap: 0,
        quantity_rework: 0,
        scrap_reason_id: "",
        material_lot: "",
        notes: "",
    });

    const [scrapReasons, setScrapReasons] = useState\u003cScrapReason[]\u003e([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState\u003cstring | null\u003e(null);

    // Fetch scrap reasons when modal opens
    useEffect(() =\u003e {
        if(isOpen) {
            fetchScrapReasons();
        }
    }, [isOpen]);

    // Auto-calculate rework when produced, good, and scrap change
    useEffect(() =\u003e {
        const { quantity_produced, quantity_good, quantity_scrap } = formData;
        const calculatedRework = quantity_produced - quantity_good - quantity_scrap;

        if(calculatedRework \u003e = 0 \u0026\u0026 calculatedRework !== formData.quantity_rework) {
        setFormData((prev) =\u003e({ ...prev, quantity_rework: calculatedRework }));
    }
}, [formData.quantity_produced, formData.quantity_good, formData.quantity_scrap]);

const fetchScrapReasons = async() =\u003e {
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

const validate = (): boolean =\u003e {
    const { quantity_produced, quantity_good, quantity_scrap, quantity_rework, scrap_reason_id } = formData;

// Validate sum constraint
if (quantity_produced !== quantity_good + quantity_scrap + quantity_rework) {
    setValidationError("Produced must equal Good + Scrap + Rework");
    return false;
}

// Validate scrap reason required if scrap \u003e 0
if (quantity_scrap \u003e 0 \u0026\u0026!scrap_reason_id) {
    setValidationError("Scrap reason is required when scrap quantity \u003e 0");
    return false;
}

// Validate non-negative
if (quantity_produced \u003c 0 || quantity_good \u003c 0 || quantity_scrap \u003c 0 || quantity_rework \u003c 0) {
    setValidationError("Quantities cannot be negative");
    return false;
}

setValidationError(null);
return true;
  };

const handleSubmit = async() =\u003e {
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

    const yieldPercentage = formData.quantity_produced \u003e 0
        ? ((formData.quantity_good / formData.quantity_produced) * 100).toFixed(1)
        : "0";

    toast.success(
        `Production recorded: ${formData.quantity_good} good parts (${yieldPercentage}% yield)`
    );

    onSuccess();
    handleClose();
} catch (error: any) {
    console.error("Error recording production:", error);
    toast.error(error.message || "Failed to record production");
} finally {
    setIsSubmitting(false);
}
  };

const handleClose = () =\u003e {
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
\u003cDialog open = { isOpen } onOpenChange = { handleClose }\u003e
\u003cDialogContent className = "max-w-md"\u003e
\u003cDialogHeader\u003e
\u003cDialogTitle\u003eRecord Production - { operationName }\u003c / DialogTitle\u003e
\u003c / DialogHeader\u003e

\u003cdiv className = "space-y-4 py-4"\u003e
{/* Header Info */ }
\u003cdiv className = "bg-muted p-3 rounded-lg text-sm"\u003e
\u003cdiv\u003e\u003cstrong\u003ePart: \u003c / strong\u003e { partNumber } \u003c / div\u003e
{ plannedQuantity \u0026\u0026(\n              \u003cdiv\u003e\u003cstrong\u003ePlanned Qty: \u003c / strong\u003e { plannedQuantity }\u003c / div\u003e\n) } \n          \u003c / div\u003e

{/* Quantity Inputs */ }
\u003cdiv className = "space-y-3"\u003e
\u003cdiv\u003e
\u003cLabel htmlFor = "produced"\u003eQuantity Produced *\u003c / Label\u003e
\u003cInput
id = "produced"
type = "number"
min = "0"
value = { formData.quantity_produced }
onChange = {(e) =\u003e
setFormData({ ...formData, quantity_produced: parseInt(e.target.value) || 0 })
                }
className = "mt-1"
    /\u003e
\u003c / div\u003e

\u003cdiv className = "grid grid-cols-3 gap-2"\u003e
\u003cdiv\u003e
\u003cLabel htmlFor = "good"\u003e• Good Parts\u003c / Label\u003e
\u003cInput
id = "good"
type = "number"
min = "0"
value = { formData.quantity_good }
onChange = {(e) =\u003e
setFormData({ ...formData, quantity_good: parseInt(e.target.value) || 0 })
                  }
className = "mt-1"
    /\u003e
\u003c / div\u003e
\u003cdiv\u003e
\u003cLabel htmlFor = "scrap"\u003e• Scrap Parts\u003c / Label\u003e
\u003cInput
id = "scrap"
type = "number"
min = "0"
value = { formData.quantity_scrap }
onChange = {(e) =\u003e
setFormData({ ...formData, quantity_scrap: parseInt(e.target.value) || 0 })
                  }
className = "mt-1"
    /\u003e
\u003c / div\u003e
\u003cdiv\u003e
\u003cLabel htmlFor = "rework"\u003e• Rework Parts\u003c / Label\u003e
\u003cInput
id = "rework"
type = "number"
min = "0"
value = { formData.quantity_rework }
onChange = {(e) =\u003e
setFormData({ ...formData, quantity_rework: parseInt(e.target.value) || 0 })
                  }
className = "mt-1"
disabled
    /\u003e
\u003c / div\u003e
\u003c / div\u003e

{/* Sum validation indicator */ }
\u003cdiv className = {`text-sm flex items-center gap-2 ${sumMatches ? "text-green-600" : "text-amber-600"}`}\u003e
{
    sumMatches ? (
    \u003c\u003e
    \u003cCheck className = "h-4 w-4" /\u003e
                  Sum matches produced({ sum })
    \u003c /\u003e
              ) : (
    \u003c\u003e
    \u003cAlertTriangle className = "h-4 w-4" /\u003e
    Sum({ sum }) must equal produced({ formData.quantity_produced })
    \u003c /\u003e
              )
}
\u003c / div\u003e
\u003c / div\u003e

{/* Scrap Reason (if scrap \u003e 0) */ }
{
    formData.quantity_scrap \u003e 0 \u0026\u0026(
        \u003cdiv\u003e
        \u003cLabel htmlFor = "scrap-reason"\u003eScrap Reason *\u003c / Label\u003e
        \u003cSelect value = { formData.scrap_reason_id } onValueChange = {(value) =\u003e setFormData({ ...formData, scrap_reason_id: value })} \u003e
\u003cSelectTrigger id = "scrap-reason" className = "mt-1"\u003e
\u003cSelectValue placeholder = "Select scrap reason" /\u003e
\u003c / SelectTrigger\u003e
\u003cSelectContent\u003e
{
    scrapReasons.map((reason) =\u003e(
        \u003cSelectItem key = { reason.id } value = { reason.id }\u003e
                      { reason.code }: { reason.description }
        \u003c / SelectItem\u003e
    ))
}
\u003c / SelectContent\u003e
\u003c / Select\u003e
\u003c / div\u003e
          )}

{/* Material Lot */ }
\u003cdiv\u003e
\u003cLabel htmlFor = "material-lot"\u003eMaterial Lot(Optional) \u003c / Label\u003e
\u003cInput
id = "material-lot"
value = { formData.material_lot }
onChange = {(e) =\u003e setFormData({ ...formData, material_lot: e.target.value })}
placeholder = "e.g., LOT-2024-1234"
className = "mt-1"
    /\u003e
\u003c / div\u003e

{/* Notes */ }
\u003cdiv\u003e
\u003cLabel htmlFor = "notes"\u003eNotes(Optional) \u003c / Label\u003e
\u003cTextarea
id = "notes"
value = { formData.notes }
onChange = {(e) =\u003e setFormData({ ...formData, notes: e.target.value })}
placeholder = "Any additional notes..."
rows = { 2}
className = "mt-1"
    /\u003e
\u003c / div\u003e

{/* Validation Error */ }
{
    validationError \u0026\u0026(
        \u003cAlert variant = "destructive"\u003e
        \u003cAlertDescription\u003e{ validationError }\u003c / AlertDescription\u003e
        \u003c / Alert\u003e
    )
}
\u003c / div\u003e

{/* Actions */ }
\u003cdiv className = "flex justify-end gap-2"\u003e
\u003cButton variant = "outline" onClick = { handleClose } disabled = { isSubmitting }\u003e
Cancel
\u003c / Button\u003e
\u003cButton onClick = { handleSubmit } disabled = { isSubmitting || !sumMatches}\u003e
{ isSubmitting ? "Recording..." : "Record Production" }
\u003c / Button\u003e
\u003c / div\u003e
\u003c / DialogContent\u003e
\u003c / Dialog\u003e
  );
}
