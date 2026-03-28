import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateBatchRequirement } from "@/hooks/useBatches";

interface Requirement {
  id: string;
  material_name: string;
  quantity: number;
  status: string;
}

interface BatchRequirementsProps {
  batchId: string;
  requirements: Requirement[] | undefined;
}

export function BatchRequirements({ batchId, requirements }: BatchRequirementsProps) {
  const { t } = useTranslation();
  const createRequirement = useCreateBatchRequirement();
  const [isRequirementDialogOpen, setIsRequirementDialogOpen] = useState(false);
  const [newReqMaterial, setNewReqMaterial] = useState("");
  const [newReqQuantity, setNewReqQuantity] = useState("");

  const handleAddRequirement = async () => {
    if (!newReqMaterial || !newReqQuantity) return;

    await createRequirement.mutateAsync({
      batchId,
      materialName: newReqMaterial,
      quantity: parseFloat(newReqQuantity)
    });

    setNewReqMaterial("");
    setNewReqQuantity("");
    setIsRequirementDialogOpen(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          {t("Material Requirements")}
        </CardTitle>
        <Dialog open={isRequirementDialogOpen} onOpenChange={setIsRequirementDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("batches.addMaterialRequirement")}</DialogTitle>
              <DialogDescription>{t("batches.specifyMaterial")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("batches.materialName")}</Label>
                <Input value={newReqMaterial} onChange={(e) => setNewReqMaterial(e.target.value)} placeholder="e.g. Steel Sheet 5mm" />
              </div>
              <div className="space-y-2">
                <Label>{t("batches.quantity")}</Label>
                <Input type="number" value={newReqQuantity} onChange={(e) => setNewReqQuantity(e.target.value)} placeholder="0" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRequirementDialogOpen(false)}>{t("Cancel")}</Button>
              <Button onClick={handleAddRequirement}>{t("Add")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {requirements && requirements.length > 0 ? (
          <div className="space-y-2">
            {requirements.map((req) => (
              <div key={req.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded border">
                <span>{req.material_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">x{req.quantity}</Badge>
                  <Badge variant={req.status === 'received' ? 'default' : req.status === 'ordered' ? 'secondary' : 'outline'}>
                    {req.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("No requirements raised")}</p>
        )}
      </CardContent>
    </Card>
  );
}
