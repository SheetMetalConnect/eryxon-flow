import { useCallback, useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Calculator, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import {
  computeStructuralRequirement,
  evaluateInventoryCandidate,
} from "@/lib/inventory/structural";
import type { GratingMaterial, GratingSurface, LoadDuty, LoadKind } from "@/lib/inventory/types";
import {
  formatMaterial,
  formatSurface,
  qtyAvailable,
  type InventoryItem,
} from "@/lib/inventory/inventoryTypes";
import { cn } from "@/lib/utils";

interface RankedMatch {
  item: InventoryItem;
  passes: boolean;
  S_ratio: number | null;
  I_ratio: number | null;
  reasons: string[];
  score: number;
}

type JobOption = {
  id: string;
  job_number: string;
  customer: string;
};

export default function InventoryCalculator() {
  const profile = useProfile();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [allocatingId, setAllocatingId] = useState<string | null>(null);

  const [spanIn, setSpanIn] = useState(36);
  const [loadKind, setLoadKind] = useState<LoadKind>("uniform_psf");
  const [loadValue, setLoadValue] = useState(100);
  const [surface, setSurface] = useState<GratingSurface>("smooth");
  const [duty, setDuty] = useState<LoadDuty>("pedestrian");
  const [material, setMaterial] = useState<GratingMaterial>("carbon_steel");
  const [reserveQty, setReserveQty] = useState(1);
  const [jobId, setJobId] = useState<string>(searchParams.get("jobId") || "none");
  const [matches, setMatches] = useState<RankedMatch[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const [itemsRes, jobsRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("kind", "bar_grating")
        .order("sku"),
      supabase
        .from("jobs")
        .select("id, job_number, customer")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (itemsRes.error) {
      toast.error("Failed to load inventory");
      setLoading(false);
      return;
    }
    if (jobsRes.error) toast.error(jobsRes.error.message || "Failed to load jobs");
    setItems((itemsRes.data || []) as unknown as InventoryItem[]);
    setJobs((jobsRes.data || []) as JobOption[]);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const fromUrl = searchParams.get("jobId");
    if (fromUrl) setJobId(fromUrl);
  }, [searchParams]);

  const inStock = useMemo(
    () => items.filter((i) => qtyAvailable(i) > 0 && !i.needs_reconciliation),
    [items],
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === jobId) || null,
    [jobs, jobId],
  );

  const runCalculator = () => {
    setRunning(true);
    try {
      const req = computeStructuralRequirement({
        spanIn,
        loadKind,
        loadValue,
        surface,
        duty,
        material,
      });
      setAssumptions(req.assumptions);

      const ranked: RankedMatch[] = [];
      for (const item of inStock) {
        if (item.bar_depth_in == null || item.bar_thickness_in == null) continue;
        if (item.material !== material) continue;
        if (surface !== "unknown" && item.surface !== "unknown" && item.surface !== surface) {
          continue;
        }

        const result = evaluateInventoryCandidate(
          {
            barDepthIn: Number(item.bar_depth_in),
            barThicknessIn: Number(item.bar_thickness_in),
            designation: item.designation,
            surface: item.surface === "unknown" ? surface : item.surface,
            material: item.material,
          },
          req,
        );

        const score =
          (result.S_ratio ?? 0) + (result.I_ratio ?? 0) + (result.passes ? 100 : 0);
        ranked.push({
          item,
          passes: result.passes,
          S_ratio: result.S_ratio,
          I_ratio: result.I_ratio,
          reasons: result.reasons,
          score,
        });
      }

      // Sort ascending so the LEAST over-engineered (most economical) passing grating is at the top
      ranked.sort((a, b) => {
        if (a.passes !== b.passes) return a.passes ? -1 : 1;
        return a.score - b.score;
      });

      setMatches(ranked.filter((m) => m.passes));
      if (ranked.filter((m) => m.passes).length === 0) {
        toast.message("No in-stock panels meet these requirements");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Calculator failed");
      setMatches([]);
    } finally {
      setRunning(false);
    }
  };

  const allocate = async (item: InventoryItem) => {
    if (!profile?.tenant_id) return;
    const qty = Math.max(1, Math.floor(reserveQty));
    const available = qtyAvailable(item);
    if (qty > available) {
      toast.error(`Only ${available} panels available for ${item.sku}`);
      return;
    }

    setAllocatingId(item.id);
    const area = item.area_sqft != null ? Number(item.area_sqft) * qty : null;

    const { error: allocErr } = await supabase.from("inventory_allocations").insert({
      tenant_id: profile.tenant_id,
      inventory_item_id: item.id,
      status: "reserved",
      qty_panels: qty,
      area_sqft: area,
      job_id: jobId === "none" ? null : jobId,
      created_by: profile.id,
      load_calc_snapshot: {
        spanIn,
        loadKind,
        loadValue,
        surface,
        duty,
        material,
      },
      note: selectedJob
        ? `Reserved for ${selectedJob.job_number}`
        : "Reserved from load calculator",
    });

    if (allocErr) {
      toast.error(allocErr.message || "Allocation failed");
      setAllocatingId(null);
      return;
    }

    const { error: updErr } = await supabase
      .from("inventory_items")
      .update({
        qty_reserved: (item.qty_reserved || 0) + qty,
      })
      .eq("id", item.id);

    if (updErr) {
      toast.error(updErr.message || "Failed to update item reserved quantity");
    } else {
      toast.success(`Successfully reserved ${qty} panel(s) of ${item.sku}`);
      await load();
    }

    setAllocatingId(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Load calculator</h1>
          <p className="text-muted-foreground">
            NAAMM-aligned sizing against in-stock panels
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
            <Link to="/admin/inventory">Stock list</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Inputs
            </CardTitle>
            <CardDescription>Clear span, load, surface, material, duty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Work order</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Optional job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job (unlinked)</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_number} — {j.customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedJob && (
                <p className="text-xs text-muted-foreground">
                  Reservations will attach to {selectedJob.job_number}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="span">Clear span (inches)</Label>
              <Input
                id="span"
                type="number"
                className="min-h-11"
                value={spanIn}
                onChange={(e) => setSpanIn(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Load type</Label>
              <Select
                value={loadKind}
                onValueChange={(v) => setLoadKind(v as LoadKind)}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform_psf">Uniform (psf)</SelectItem>
                  <SelectItem value="concentrated_plf">
                    Concentrated (lb/ft width)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="load">
                {loadKind === "uniform_psf" ? "Uniform load (psf)" : "Concentrated (lb/ft)"}
              </Label>
              <Input
                id="load"
                type="number"
                className="min-h-11"
                value={loadValue}
                onChange={(e) => setLoadValue(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Required surface</Label>
              <Select
                value={surface}
                onValueChange={(v) => setSurface(v as GratingSurface)}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smooth">Smooth</SelectItem>
                  <SelectItem value="serrated">Serrated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duty</Label>
              <Select value={duty} onValueChange={(v) => setDuty(v as LoadDuty)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedestrian">Standard / pedestrian</SelectItem>
                  <SelectItem value="heavy_duty">Heavy / vehicular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Select
                value={material}
                onValueChange={(v) => setMaterial(v as GratingMaterial)}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carbon_steel">Carbon Steel</SelectItem>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                  <SelectItem value="stainless">Stainless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve">Panels to reserve</Label>
              <Input
                id="reserve"
                type="number"
                min={1}
                className="min-h-11"
                value={reserveQty}
                onChange={(e) => setReserveQty(Number(e.target.value) || 1)}
              />
            </div>
            <Button
              className="w-full min-h-12 text-base"
              disabled={running}
              onClick={runCalculator}
            >
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Find in-stock matches
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Passing in-stock panels</CardTitle>
            <CardDescription>
              Ranked most economical first (lowest passing structural margin). Only available stock shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Spec</TableHead>
                    <TableHead className="text-right">Avail</TableHead>
                    <TableHead className="text-right">S ratio</TableHead>
                    <TableHead className="text-right">I ratio</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((m) => (
                    <TableRow key={m.item.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {m.item.sku}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[20rem]">
                        <div className="text-sm">
                          {m.item.bar_depth_in}&quot; × {m.item.bar_thickness_in}&quot;{" "}
                          {m.item.designation || ""} · {formatSurface(m.item.surface)} ·{" "}
                          {formatMaterial(m.item.material)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate" title={m.item.raw_description}>
                          {m.item.raw_description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {qtyAvailable(m.item)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.S_ratio?.toFixed(2) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.I_ratio?.toFixed(2) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="min-h-10"
                          disabled={allocatingId === m.item.id}
                          onClick={() => void allocate(m.item)}
                        >
                          {allocatingId === m.item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Allocate / Reserve"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {matches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Run the calculator to see matching stock.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {assumptions.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground">Assumptions</div>
                {assumptions.map((a) => (
                  <div key={a} className={cn("leading-relaxed")}>
                    • {a}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
