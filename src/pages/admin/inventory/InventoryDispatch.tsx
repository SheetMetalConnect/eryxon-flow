import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Truck, PackageCheck, Briefcase, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type JobOption = {
  id: string;
  job_number: string;
  customer: string;
};

type ReservedLine = {
  id: string;
  job_id: string | null;
  qty_panels: number;
  area_sqft: number | null;
  note: string | null;
  created_at: string;
  inventory_item_id: string;
  inventory_items: {
    sku: string;
    raw_description: string;
    designation: string | null;
  } | null;
  jobs: { job_number: string; customer: string } | null;
};

type DispatchRow = {
  id: string;
  dispatch_number: string;
  status: string;
  customer_name: string | null;
  delivery_address: string | null;
  shipped_at: string | null;
  created_at: string;
  job_id: string | null;
  jobs: { job_number: string } | null;
};

export default function InventoryDispatch() {
  const profile = useProfile();
  const [searchParams] = useSearchParams();
  const preselectJobId = searchParams.get("jobId");

  const [loading, setLoading] = useState(true);
  const [reserved, setReserved] = useState<ReservedLine[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobFilter, setJobFilter] = useState<string>(preselectJobId || "all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [dispatchJobId, setDispatchJobId] = useState<string>("none");

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const [resRes, dispRes, jobsRes, usedRes] = await Promise.all([
      supabase
        .from("inventory_allocations")
        .select(
          `id, job_id, qty_panels, area_sqft, note, created_at, inventory_item_id,
           inventory_items(sku, raw_description, designation),
           jobs(job_number, customer)`,
        )
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "reserved")
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory_dispatches")
        .select(
          "id, dispatch_number, status, customer_name, delivery_address, shipped_at, created_at, job_id, jobs(job_number)",
        )
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("jobs")
        .select("id, job_number, customer")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("inventory_dispatch_lines")
        .select("allocation_id")
        .eq("tenant_id", profile.tenant_id),
    ]);

    if (resRes.error) toast.error(resRes.error.message || "Failed to load reservations");
    if (dispRes.error) toast.error(dispRes.error.message || "Failed to load dispatches");
    if (jobsRes.error) toast.error(jobsRes.error.message || "Failed to load jobs");

    const usedIds = new Set(
      ((usedRes.data || []) as { allocation_id: string }[]).map((r) => r.allocation_id),
    );
    setReserved(
      ((resRes.data || []) as unknown as ReservedLine[]).filter((r) => !usedIds.has(r.id)),
    );
    setDispatches((dispRes.data || []) as unknown as DispatchRow[]);
    setJobs((jobsRes.data || []) as JobOption[]);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (preselectJobId) {
      setJobFilter(preselectJobId);
      setDispatchJobId(preselectJobId);
    }
  }, [preselectJobId]);

  const filteredReserved = useMemo(() => {
    if (jobFilter === "all") return reserved;
    if (jobFilter === "unlinked") return reserved.filter((r) => !r.job_id);
    return reserved.filter((r) => r.job_id === jobFilter);
  }, [reserved, jobFilter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filteredReserved.map((r) => r.id)));
  };

  const openCreate = () => {
    if (selected.size === 0) {
      toast.error("Select at least one reserved line");
      return;
    }
    const lines = reserved.filter((r) => selected.has(r.id));
    const jobIds = [...new Set(lines.map((l) => l.job_id).filter(Boolean))] as string[];
    if (jobIds.length === 1) {
      setDispatchJobId(jobIds[0]);
      const job = jobs.find((j) => j.id === jobIds[0]);
      if (job) setCustomerName(job.customer || "");
    } else if (preselectJobId) {
      setDispatchJobId(preselectJobId);
      const job = jobs.find((j) => j.id === preselectJobId);
      if (job && !customerName) setCustomerName(job.customer || "");
    }
    setCreateOpen(true);
  };

  const createDispatch = async () => {
    if (!profile?.tenant_id) return;
    const lines = reserved.filter((r) => selected.has(r.id));
    if (lines.length === 0) return;

    setSaving(true);
    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    const dispatchNumber = `DSP-${stamp}`;

    const { data: dispatch, error: dErr } = await supabase
      .from("inventory_dispatches")
      .insert({
        tenant_id: profile.tenant_id,
        dispatch_number: dispatchNumber,
        job_id: dispatchJobId === "none" ? null : dispatchJobId,
        status: "ready",
        customer_name: customerName.trim() || null,
        delivery_address: address.trim() || null,
        delivery_city: city.trim() || null,
        delivery_notes: deliveryNotes.trim() || null,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (dErr || !dispatch) {
      setSaving(false);
      toast.error(dErr?.message || "Failed to create dispatch");
      return;
    }

    const lineRows = lines.map((l) => ({
      tenant_id: profile.tenant_id,
      dispatch_id: dispatch.id,
      allocation_id: l.id,
      inventory_item_id: l.inventory_item_id,
      qty_panels: l.qty_panels,
    }));

    const { error: lErr } = await supabase.from("inventory_dispatch_lines").insert(lineRows);
    setSaving(false);

    if (lErr) {
      toast.error(lErr.message || "Failed to add dispatch lines");
      // best-effort cleanup
      await supabase.from("inventory_dispatches").delete().eq("id", dispatch.id);
      return;
    }

    toast.success(`Dispatch ${dispatchNumber} ready to ship`);
    setCreateOpen(false);
    setSelected(new Set());
    setAddress("");
    setCity("");
    setDeliveryNotes("");
    await load();
  };

  const shipDispatch = async (id: string) => {
    setShippingId(id);
    const { error } = await supabase.rpc("ship_inventory_dispatch", {
      p_dispatch_id: id,
    });
    setShippingId(null);
    if (error) {
      toast.error(error.message || "Ship failed");
      return;
    }
    toast.success("Dispatch shipped — stock issued from inventory");
    await load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allFilteredSelected =
    filteredReserved.length > 0 && filteredReserved.every((r) => selected.has(r.id));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery dispatch</h1>
          <p className="text-muted-foreground mt-1">
            Pick reserved panels into a delivery ticket, then ship to issue stock from on-hand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/inventory/work-orders">
              <Briefcase className="mr-2 h-4 w-4" />
              Work orders
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreate} disabled={selected.size === 0}>
            <Truck className="mr-2 h-4 w-4" />
            Create dispatch ({selected.size})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Reserved stock</CardTitle>
            <CardDescription>
              Select lines to pack. Shipping will mark allocations issued and reduce qty on hand.
            </CardDescription>
          </div>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              <SelectItem value="unlinked">Unlinked only</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.job_number} — {j.customer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={(v) => toggleAll(Boolean(v))}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Panels</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReserved.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No reserved stock
                    {jobFilter !== "all" ? " for this filter" : ""}.{" "}
                    <Link className="underline" to="/admin/inventory/calculator">
                      Reserve from calculator
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReserved.map((line) => (
                  <TableRow
                    key={line.id}
                    className={cn(selected.has(line.id) && "bg-muted/40")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(line.id)}
                        onCheckedChange={() => toggle(line.id)}
                        aria-label={`Select ${line.inventory_items?.sku}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{line.inventory_items?.sku || "—"}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                        {line.inventory_items?.raw_description}
                      </div>
                    </TableCell>
                    <TableCell>
                      {line.jobs?.job_number ? (
                        <div>
                          <div className="font-medium">{line.jobs.job_number}</div>
                          <div className="text-xs text-muted-foreground">{line.jobs.customer}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">Unlinked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {Number(line.qty_panels)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(line.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[10rem] truncate">
                      {line.note || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Recent dispatches
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No dispatches yet
                  </TableCell>
                </TableRow>
              ) : (
                dispatches.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.dispatch_number}</TableCell>
                    <TableCell>{d.jobs?.job_number || "—"}</TableCell>
                    <TableCell>
                      <div>{d.customer_name || "—"}</div>
                      {d.delivery_address && (
                        <div className="text-xs text-muted-foreground">{d.delivery_address}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={d.status === "shipped" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d, HH:mm")}
                      {d.shipped_at && (
                        <div className="text-xs">
                          Shipped {format(new Date(d.shipped_at), "MMM d, HH:mm")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.status !== "shipped" && d.status !== "cancelled" ? (
                        <Button
                          size="sm"
                          onClick={() => void shipDispatch(d.id)}
                          disabled={shippingId === d.id}
                        >
                          {shippingId === d.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Mark shipped
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create delivery dispatch</DialogTitle>
            <DialogDescription>
              {selected.size} line(s) selected. Confirm delivery details, then ship when the truck leaves.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Work order (optional)</Label>
              <Select value={dispatchJobId} onValueChange={setDispatchJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_number} — {j.customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust">Customer</Label>
              <Input
                id="cust"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr">Delivery address</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dnotes">Notes</Label>
              <Textarea
                id="dnotes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createDispatch()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
