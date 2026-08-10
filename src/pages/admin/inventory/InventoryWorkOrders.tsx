import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Calculator, Truck, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type JobRow = {
  id: string;
  job_number: string;
  customer: string;
  due_date: string | null;
  status: string;
};

type AllocationRow = {
  id: string;
  job_id: string | null;
  status: string;
  qty_panels: number;
  inventory_item_id: string;
  inventory_items: { sku: string; raw_description: string } | null;
};

type JobMaterialSummary = JobRow & {
  reservedPanels: number;
  issuedPanels: number;
  reservedLines: number;
  skus: string[];
};

export default function InventoryWorkOrders() {
  const profile = useProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [jobNumber, setJobNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const [jobsRes, allocRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, job_number, customer, due_date, status")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("inventory_allocations")
        .select(
          "id, job_id, status, qty_panels, inventory_item_id, inventory_items(sku, raw_description)",
        )
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["reserved", "issued"]),
    ]);

    if (jobsRes.error) toast.error(jobsRes.error.message || "Failed to load jobs");
    if (allocRes.error) toast.error(allocRes.error.message || "Failed to load allocations");

    setJobs((jobsRes.data || []) as JobRow[]);
    setAllocations((allocRes.data || []) as unknown as AllocationRow[]);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaries = useMemo((): JobMaterialSummary[] => {
    const byJob = new Map<string, AllocationRow[]>();
    for (const a of allocations) {
      if (!a.job_id) continue;
      const list = byJob.get(a.job_id) || [];
      list.push(a);
      byJob.set(a.job_id, list);
    }

    return jobs.map((job) => {
      const lines = byJob.get(job.id) || [];
      const reserved = lines.filter((l) => l.status === "reserved");
      const issued = lines.filter((l) => l.status === "issued");
      const skus = [
        ...new Set(
          reserved
            .map((l) => l.inventory_items?.sku)
            .filter((s): s is string => Boolean(s)),
        ),
      ];
      return {
        ...job,
        reservedPanels: reserved.reduce((s, l) => s + Number(l.qty_panels), 0),
        issuedPanels: issued.reduce((s, l) => s + Number(l.qty_panels), 0),
        reservedLines: reserved.length,
        skus,
      };
    });
  }, [jobs, allocations]);

  const unlinkedReserved = useMemo(
    () => allocations.filter((a) => a.status === "reserved" && !a.job_id),
    [allocations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (j) =>
        j.job_number.toLowerCase().includes(q) ||
        (j.customer || "").toLowerCase().includes(q) ||
        j.skus.some((s) => s.toLowerCase().includes(q)),
    );
  }, [summaries, search]);

  const createWorkOrder = async () => {
    if (!profile?.tenant_id) return;
    const number = jobNumber.trim();
    const cust = customer.trim();
    if (!number || !cust) {
      toast.error("Job number and customer are required");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        tenant_id: profile.tenant_id,
        job_number: number,
        customer: cust,
        due_date: dueDate || null,
        status: "not_started",
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    setCreating(false);
    if (error) {
      toast.error(error.message || "Failed to create work order");
      return;
    }
    toast.success(`Work order ${number} created`);
    setCreateOpen(false);
    setJobNumber("");
    setCustomer("");
    setDueDate("");
    setNotes("");
    await load();
    if (data?.id) {
      navigate(`/admin/inventory/calculator?jobId=${data.id}`);
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Work orders</h1>
          <p className="text-muted-foreground mt-1">
            Eryxon jobs with reserved grating stock — reserve from the calculator, then dispatch delivery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/inventory/dispatch">
              <Truck className="mr-2 h-4 w-4" />
              Delivery dispatch
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/inventory/calculator">
              <Calculator className="mr-2 h-4 w-4" />
              Load calculator
            </Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New work order
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open jobs</CardDescription>
            <CardTitle className="text-2xl">{jobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Jobs with reserved stock</CardDescription>
            <CardTitle className="text-2xl">
              {summaries.filter((s) => s.reservedPanels > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unlinked reservations</CardDescription>
            <CardTitle className="text-2xl">{unlinkedReserved.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Reserved without a job — link them when creating a dispatch or re-reserve with a job selected.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Material by work order
            </CardTitle>
            <CardDescription>Reserve panels, then open delivery dispatch to ship.</CardDescription>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Search job, customer, SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead>SKUs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No work orders yet. Create one to start reserving stock.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.job_number}</TableCell>
                    <TableCell>{job.customer}</TableCell>
                    <TableCell>
                      {job.due_date ? format(new Date(job.due_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          job.reservedPanels > 0 && "font-semibold text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {job.reservedPanels}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{job.issuedPanels}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                      {job.skus.length ? job.skus.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/admin/inventory/calculator?jobId=${job.id}`)
                          }
                        >
                          Reserve
                        </Button>
                        <Button
                          size="sm"
                          disabled={job.reservedLines === 0}
                          onClick={() =>
                            navigate(`/admin/inventory/dispatch?jobId=${job.id}`)
                          }
                        >
                          Dispatch
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New material work order</DialogTitle>
            <DialogDescription>
              Creates an Eryxon job. You can add shop floor parts later; for grating, reserve stock next.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="wo-number">Job number</Label>
              <Input
                id="wo-number"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="e.g. WO-1042"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wo-customer">Customer</Label>
              <Input
                id="wo-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wo-due">Due date</Label>
              <Input
                id="wo-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wo-notes">Notes</Label>
              <Textarea
                id="wo-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createWorkOrder()} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create &amp; reserve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
