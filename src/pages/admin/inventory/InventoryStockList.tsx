import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  formatFinish,
  formatMaterial,
  formatSurface,
  qtyAvailable,
  type InventoryItem,
} from "@/lib/inventory/inventoryTypes";
import { cn } from "@/lib/utils";

export default function InventoryStockList() {
  const profile = useProfile();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [material, setMaterial] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [surface, setSurface] = useState<string>("all");
  const [finish, setFinish] = useState<string>("all");

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("sku");
    if (error) {
      toast.error("Failed to load inventory");
      setLoading(false);
      return;
    }
    setItems((data || []) as unknown as InventoryItem[]);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (material !== "all" && item.material !== material) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (surface !== "all" && item.surface !== surface) return false;
      if (finish !== "all" && item.finish !== finish) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q) ||
        item.raw_description.toLowerCase().includes(q) ||
        (item.designation || "").toLowerCase().includes(q) ||
        (item.source_item_no || "").toLowerCase().includes(q)
      );
    });
  }, [items, search, material, kind, surface, finish]);

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Parsed bar grating and tread stock ({items.length} items)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/inventory/work-orders">Work orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/inventory/dispatch">Dispatch</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/inventory/reconcile">Reconcile</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/inventory/calculator">Load calculator</Link>
          </Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Stock list
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="inv-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="inv-search"
                  className="pl-9 min-h-11"
                  placeholder="SKU, description, designation…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="carbon_steel">Carbon Steel</SelectItem>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                  <SelectItem value="stainless">Stainless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bar_grating">Bar Grating</SelectItem>
                  <SelectItem value="tread">Treads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Surface</Label>
              <Select value={surface} onValueChange={setSurface}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="smooth">Smooth</SelectItem>
                  <SelectItem value="serrated">Serrated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Finish</Label>
              <Select value={finish} onValueChange={setFinish}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bare">Bare</SelectItem>
                  <SelectItem value="unpainted">Unpainted</SelectItem>
                  <SelectItem value="galvanized">Galvanized</SelectItem>
                  <SelectItem value="painted_black">Painted Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Surface</TableHead>
                  <TableHead>Finish</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const negative = item.qty_on_hand < 0 || item.needs_reconciliation;
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(negative && "bg-destructive/5")}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {item.sku}
                        {item.needs_reconciliation && (
                          <Badge variant="destructive" className="ml-2">
                            Reconcile
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[28rem] truncate" title={item.raw_description}>
                        {item.raw_description}
                      </TableCell>
                      <TableCell className="capitalize">
                        {item.kind === "bar_grating" ? "Bar Grating" : item.kind}
                      </TableCell>
                      <TableCell>{formatMaterial(item.material)}</TableCell>
                      <TableCell>{formatSurface(item.surface)}</TableCell>
                      <TableCell>{formatFinish(item.finish)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          item.qty_on_hand < 0 && "text-destructive",
                        )}
                      >
                        {item.qty_on_hand}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {qtyAvailable(item)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      No items match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
