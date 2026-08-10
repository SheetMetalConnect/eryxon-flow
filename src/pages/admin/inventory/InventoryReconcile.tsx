import { useCallback, useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, Minus, Plus, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import type { InventoryItem } from "@/lib/inventory/inventoryTypes";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "cycle_count", label: "Cycle Count" },
  { value: "import_true_up", label: "Found in yard / true-up" },
  { value: "correction", label: "Correction" },
  { value: "damage", label: "Damage" },
  { value: "scrap", label: "Scrap" },
  { value: "other", label: "Other" },
] as const;

export default function InventoryReconcile() {
  const profile = useProfile();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState(0);
  const [reason, setReason] = useState<string>("cycle_count");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("needs_reconciliation", true)
      .order("qty_on_hand", { ascending: true });
    if (error) {
      toast.error("Failed to load reconcile queue");
      setLoading(false);
      return;
    }
    setItems((data || []) as unknown as InventoryItem[]);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdjust = (item: InventoryItem) => {
    setActive(item);
    setNewQty(Math.max(0, Math.round(Number(item.qty_on_hand))));
    setReason("cycle_count");
    setNote("");
  };

  const bump = (delta: number) => {
    setNewQty((q) => Math.max(0, q + delta));
  };

  const submitAdjust = async () => {
    if (!profile?.tenant_id || !active) return;
    setSaving(true);
    const qtyBefore = Number(active.qty_on_hand);
    const qtyAfter = Number(newQty);
    const needsReconciliation = qtyAfter < 0;

    const { error: adjError } = await supabase.from("inventory_adjustments").insert({
      tenant_id: profile.tenant_id,
      inventory_item_id: active.id,
      reason,
      qty_before: qtyBefore,
      qty_after: qtyAfter,
      note: note.trim() || null,
      adjusted_by: profile.id,
    });

    if (adjError) {
      toast.error(adjError.message || "Failed to write adjustment");
      setSaving(false);
      return;
    }

    const { error: updError } = await supabase
      .from("inventory_items")
      .update({
        qty_on_hand: qtyAfter,
        needs_reconciliation: needsReconciliation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", active.id);

    if (updError) {
      toast.error(updError.message || "Failed to update quantity");
      setSaving(false);
      return;
    }

    toast.success(`Updated ${active.sku}: ${qtyBefore} → ${qtyAfter}`);
    setActive(null);
    setSaving(false);
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reconcile</h1>
          <p className="text-muted-foreground">
            Cycle-count items flagged for reconciliation ({items.length})
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/inventory">Back to stock list</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
            No items need reconciliation right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "glass-card border-destructive/40",
                item.qty_on_hand < 0 && "bg-destructive/5",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.sku}</CardTitle>
                  <Badge variant="destructive" className="shrink-0">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {item.qty_on_hand}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {item.raw_description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {item.category} · {item.designation || "no designation"}
                </div>
                <Button
                  className="w-full min-h-12 text-base"
                  onClick={() => openAdjust(item)}
                >
                  Quick adjust
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock: {active?.sku}</DialogTitle>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* Tablet-friendly large quick-adjust buttons */}
            <div className="flex items-center justify-center gap-8">
              <Button
                variant="outline"
                size="icon"
                className="h-20 w-20 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20"
                onClick={() => bump(-1)}
              >
                <Minus className="h-10 w-10" />
              </Button>

              <div className="text-center min-w-[100px]">
                <div className="text-6xl font-bold tabular-nums">{newQty}</div>
                <div className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
                  Panels
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  was {active?.qty_on_hand}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-20 w-20 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                onClick={() => bump(1)}
              >
                <Plus className="h-10 w-10" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Adjustment</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason" className="h-12 text-lg">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-base py-3">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Optional Note</Label>
                <Input
                  id="note"
                  placeholder="e.g., Found behind the band saw"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setActive(null)}
              className="w-full sm:w-auto h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void submitAdjust()}
              disabled={saving}
              className="w-full sm:w-auto h-12 text-base"
            >
              {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
