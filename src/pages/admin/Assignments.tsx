import { useEffect, useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCheck, X, UserPlus, ArrowRight, Users, Package, UserCog, IdCard } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";

interface Part {
  id: string;
  part_number: string;
  material: string;
  status: string;
  current_cell_id: string | null;
  job: {
    job_number: string;
    customer: string | null;
  } | null;
  _operationCount?: number;
}

interface Operator {
  id: string;
  full_name: string;
  username: string;
  _assignmentCount?: number;
  _activeEntryCount?: number;
}

interface ShopFloorOperator {
  id: string;
  employee_id: string;
  full_name: string;
  active: boolean;
  last_login_at: string | null;
}

interface Assignment {
  id: string;
  part_id: string;
  operator_id: string | null;
  shop_floor_operator_id: string | null;
  created_at: string;
  part: {
    part_number: string;
    job: {
      job_number: string;
    };
  };
  operator: {
    full_name: string;
  } | null;
  shop_floor_operator: {
    full_name: string;
    employee_id: string;
  } | null;
  assigned_by_user: {
    full_name: string;
  };
}

export default function Assignments() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [shopFloorOperators, setShopFloorOperators] = useState<ShopFloorOperator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [operatorType, setOperatorType] = useState<"shop_floor" | "profile">("shop_floor");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [createOperatorOpen, setCreateOperatorOpen] = useState(false);
  const [creatingOperator, setCreatingOperator] = useState(false);
  const [operatorForm, setOperatorForm] = useState({
    full_name: "",
    employee_id: "",
    pin: "",
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadData();
    return setupRealtime();
  }, [profile?.tenant_id]);

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    try {
      // Load available parts (not completed)
      const { data: partsData } = await supabase
        .from("parts")
        .select(
          `
          id,
          part_number,
          material,
          status,
          current_cell_id,
          job:jobs(job_number, customer)
        `,
        )
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "completed")
        .order("part_number");

      // Count operations per part
      if (partsData) {
        const partsWithCounts = await Promise.all(
          partsData.map(async (part) => {
            const { count } = await supabase
              .from("operations")
              .select("*", { count: "exact", head: true })
              .eq("part_id", part.id);
            return { ...part, _operationCount: count || 0 };
          }),
        );
        setParts(partsWithCounts);
      }

      // Load active operators
      const { data: operatorsData } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("tenant_id", profile.tenant_id)
        .eq("role", "operator")
        .eq("active", true)
        .eq("is_machine", false)
        .order("full_name");

      // Count assignments and active entries per operator
      if (operatorsData) {
        const operatorsWithCounts = await Promise.all(
          operatorsData.map(async (op) => {
            const [{ count: assignmentCount }, { count: activeCount }] =
              await Promise.all([
                supabase
                  .from("assignments")
                  .select("*", { count: "exact", head: true })
                  .eq("operator_id", op.id)
                  .eq("status", "assigned"),
                supabase
                  .from("time_entries")
                  .select("*", { count: "exact", head: true })
                  .eq("operator_id", op.id)
                  .is("end_time", null),
              ]);
            return {
              ...op,
              _assignmentCount: assignmentCount || 0,
              _activeEntryCount: activeCount || 0,
            };
          }),
        );
        setOperators(operatorsWithCounts);
      }

      // Load shop floor operators (PIN-based)
      try {
        const { data: sfOperators, error: sfError } = await supabase.rpc('list_operators' as any);
        if (!sfError && sfOperators) {
          setShopFloorOperators((sfOperators as ShopFloorOperator[]).filter(op => op.active));
        }
      } catch {
        // Fallback to direct query
        const { data: directSf } = await supabase
          .from('operators')
          .select('id, employee_id, full_name, active, last_login_at')
          .eq('active', true)
          .order('full_name');
        if (directSf) {
          setShopFloorOperators(directSf as ShopFloorOperator[]);
        }
      }

      // Load current assignments (both profile-based and shop floor operator assignments)
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(
          `
          id,
          part_id,
          operator_id,
          shop_floor_operator_id,
          created_at,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          ),
          operator:profiles!assignments_operator_id_fkey(full_name),
          shop_floor_operator:operators!assignments_shop_floor_operator_id_fkey(full_name, employee_id),
          assigned_by_user:profiles!assignments_assigned_by_fkey(full_name)
        `,
        )
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "assigned")
        .order("created_at", { ascending: false });

      if (assignmentsData) setAssignments(assignmentsData as any);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error(t("assignments.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel("assignments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignments",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAssign = async () => {
    if (!selectedPart || !selectedOperator || !profile?.id || !profile?.tenant_id) {
      toast.error(t("assignments.selectBoth"));
      return;
    }

    setAssigning(true);
    try {
      const part = parts.find((p) => p.id === selectedPart);
      if (!part) return;

      // Create assignment based on operator type
      const assignmentData: any = {
        tenant_id: profile.tenant_id,
        part_id: selectedPart,
        job_id: (part.job as any)?.id || null,
        assigned_by: profile.id,
        status: "assigned",
      };

      if (operatorType === "shop_floor") {
        assignmentData.shop_floor_operator_id = selectedOperator;
        assignmentData.operator_id = null;
      } else {
        assignmentData.operator_id = selectedOperator;
        assignmentData.shop_floor_operator_id = null;
      }

      const { error: assignError } = await supabase.from("assignments").insert(assignmentData);

      if (assignError) throw assignError;

      // Only update operations with operator_id if it's a profile-based operator
      if (operatorType === "profile") {
        const { error: operationError } = await supabase
          .from("operations")
          .update({ assigned_operator_id: selectedOperator })
          .eq("part_id", selectedPart)
          .eq("tenant_id", profile.tenant_id);

        if (operationError) throw operationError;
      }

      // Get assigned operator name for success message
      const operatorName = operatorType === "shop_floor"
        ? shopFloorOperators.find(o => o.id === selectedOperator)?.full_name
        : operators.find(o => o.id === selectedOperator)?.full_name;

      toast.success(t("assignments.assignedToOperator", { name: operatorName }));
      setSelectedPart("");
      setSelectedOperator("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || t("assignments.failedToAssign"));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, partId: string) => {
    if (!profile?.tenant_id) return;

    try {
      // Delete assignment
      const { error: deleteError } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (deleteError) throw deleteError;

      // Clear assigned_operator_id from operations
      const { error: operationError } = await supabase
        .from("operations")
        .update({ assigned_operator_id: null })
        .eq("part_id", partId)
        .eq("tenant_id", profile.tenant_id);

      if (operationError) throw operationError;

      toast.success(t("assignments.removed"));
      loadData();
    } catch (error: any) {
      toast.error(error.message || t("assignments.failedToRemove"));
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operatorForm.full_name.trim()) {
      toast.error(t("users.enterOperatorName"));
      return;
    }

    if (!operatorForm.pin || operatorForm.pin.length < 4 || operatorForm.pin.length > 6) {
      toast.error(t("users.pinLength"));
      return;
    }

    if (!/^\d+$/.test(operatorForm.pin)) {
      toast.error(t("users.pinDigitsOnly"));
      return;
    }

    setCreatingOperator(true);

    try {
      const employeeId = operatorForm.employee_id.trim() || `OPR-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase.rpc('create_operator_with_pin' as any, {
        p_full_name: operatorForm.full_name.trim(),
        p_pin: operatorForm.pin,
        p_employee_id: employeeId || undefined,
      });

      if (error) throw error;

      toast.success(t("notifications.created"));
      setCreateOperatorOpen(false);
      setOperatorForm({
        full_name: "",
        employee_id: "",
        pin: "",
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || t("notifications.failed"));
      console.error("Error creating operator:", error);
    } finally {
      setCreatingOperator(false);
    }
  };

  const columns: ColumnDef<Assignment>[] = useMemo(() => [
    {
      accessorKey: "part.part_number",
      id: "part_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.part")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.part.part_number}</span>
      ),
    },
    {
      accessorKey: "part.job.job_number",
      id: "job_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.job")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.part.job.job_number}</span>
      ),
    },
    {
      accessorKey: "operator.full_name",
      id: "operator_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.assignedTo")} />
      ),
      cell: ({ row }) => {
        const assignment = row.original;
        const operatorName = assignment.shop_floor_operator?.full_name || assignment.operator?.full_name || t("common.unknown");
        const employeeId = assignment.shop_floor_operator?.employee_id;
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant="secondary" className="text-xs w-fit">{operatorName}</Badge>
            {employeeId && (
              <span className="text-xs text-muted-foreground font-mono">{employeeId}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "assigned_by_user.full_name",
      id: "assigned_by",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.assignedBy")} />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.assigned_by_user.full_name}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.getValue("created_at")), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("assignments.action"),
      cell: ({ row }) => {
        const assignment = row.original;
        return (
          <Button
            onClick={() => handleRemoveAssignment(assignment.id, assignment.part_id)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        );
      },
    },
  ], [t]);

  // Calculate stats - must be before any conditional returns
  const assignmentStats = useMemo(() => {
    return {
      totalAssignments: assignments.length,
      availableParts: parts.length,
      activeOperators: operators.length,
      shopFloorOperators: shopFloorOperators.length,
    };
  }, [assignments, parts, operators, shopFloorOperators]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedPartData = parts.find((p) => p.id === selectedPart);
  const selectedOperatorData = operators.find((o) => o.id === selectedOperator);

  return (
    <div className="p-4 space-y-4">
      <AdminPageHeader
        title={t("assignments.title")}
        description={t("assignments.description")}
      />

      {/* Stats Row */}
      <PageStatsRow
        stats={[
          { label: t("assignments.totalAssignments", "Total Assignments"), value: assignmentStats.totalAssignments, icon: UserCheck, color: "primary" },
          { label: t("assignments.availableParts", "Available Parts"), value: assignmentStats.availableParts, icon: Package, color: "info" },
          { label: t("assignments.activeOperators", "Active Operators"), value: assignmentStats.activeOperators, icon: UserCog, color: "success" },
          { label: t("assignments.shopFloorOperators", "Shop Floor Operators"), value: assignmentStats.shopFloorOperators, icon: IdCard, color: "warning" },
        ]}
      />

      {/* Assignment Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Select Part Card */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">1. {t("assignments.selectPart")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPart} onValueChange={setSelectedPart}>
              <SelectTrigger className="bg-[rgba(17,25,40,0.75)] border-white/10">
                <SelectValue placeholder={t("assignments.selectPart")} />
              </SelectTrigger>
              <SelectContent>
                {parts.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No available parts found
                  </div>
                ) : (
                  parts.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{part.part_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {part.job?.job_number || "No Job"} • {part._operationCount} ops
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedPartData && (
              <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                <div className="text-sm font-medium">{selectedPartData.part_number}</div>
                <div className="text-xs text-muted-foreground">
                  Job: {selectedPartData.job?.job_number || "None"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Material: {selectedPartData.material}
                </div>
                <Badge variant="outline" className="text-xs mt-1">
                  {selectedPartData._operationCount} {t("assignments.operations")}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Select Operator Card */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">2. {t("assignments.selectOperator")}</CardTitle>
              <Dialog open={createOperatorOpen} onOpenChange={setCreateOperatorOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <UserPlus className="h-3 w-3" />
                    {t("common.new")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("assignments.createOperator")}</DialogTitle>
                    <DialogDescription>
                      {t("assignments.createOperatorDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateOperator} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="op_full_name">{t("common.fullName")} *</Label>
                      <Input
                        id="op_full_name"
                        value={operatorForm.full_name}
                        onChange={(e) => setOperatorForm({ ...operatorForm, full_name: e.target.value })}
                        placeholder="John Smith"
                        required
                        className="bg-[rgba(17,25,40,0.75)] border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="op_employee_id">
                        {t("assignments.employeeId")}{' '}
                        <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                      </Label>
                      <Input
                        id="op_employee_id"
                        value={operatorForm.employee_id}
                        onChange={(e) => setOperatorForm({ ...operatorForm, employee_id: e.target.value })}
                        placeholder={t("assignments.autoGenerated")}
                        className="bg-[rgba(17,25,40,0.75)] border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="op_pin">{t("assignments.pinLabel")} *</Label>
                      <Input
                        id="op_pin"
                        type="password"
                        value={operatorForm.pin}
                        onChange={(e) => setOperatorForm({ ...operatorForm, pin: e.target.value })}
                        placeholder="1234"
                        required
                        minLength={4}
                        maxLength={6}
                        className="bg-[rgba(17,25,40,0.75)] border-white/10"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("assignments.pinDescription")}
                      </p>
                    </div>

                    <Button type="submit" className="w-full cta-button gap-2" disabled={creatingOperator}>
                      {creatingOperator ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.creating")}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          {t("assignments.createOperator")}
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Operator type toggle */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
              <Button
                variant={operatorType === "shop_floor" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 h-8 text-xs gap-1"
                onClick={() => { setOperatorType("shop_floor"); setSelectedOperator(""); }}
              >
                <IdCard className="h-3 w-3" />
                {t("assignments.shopFloor")}
              </Button>
              <Button
                variant={operatorType === "profile" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 h-8 text-xs gap-1"
                onClick={() => { setOperatorType("profile"); setSelectedOperator(""); }}
              >
                <UserCog className="h-3 w-3" />
                {t("assignments.userAccount")}
              </Button>
            </div>

            {/* Shop Floor Operators dropdown */}
            {operatorType === "shop_floor" && (
              <>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="bg-[rgba(17,25,40,0.75)] border-white/10">
                    <SelectValue placeholder={t("assignments.selectShopFloorOperator")} />
                  </SelectTrigger>
                  <SelectContent>
                    {shopFloorOperators.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {t("assignments.noShopFloorOperators")}
                      </div>
                    ) : (
                      shopFloorOperators.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{op.full_name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {op.employee_id}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedOperator && operatorType === "shop_floor" && (
                  <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                    {(() => {
                      const sfOp = shopFloorOperators.find(o => o.id === selectedOperator);
                      return sfOp ? (
                        <>
                          <div className="text-sm font-medium">{sfOp.full_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {t("assignments.employeeId")}: {sfOp.employee_id}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1 bg-amber-500/10 text-amber-500 border-amber-500/30">
                            <IdCard className="h-3 w-3 mr-1" />
                            {t("assignments.pinBased")}
                          </Badge>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </>
            )}

            {/* Profile-based operators dropdown */}
            {operatorType === "profile" && (
              <>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="bg-[rgba(17,25,40,0.75)] border-white/10">
                    <SelectValue placeholder={t("assignments.selectOperator")} />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {t("assignments.noActiveOperators")}
                      </div>
                    ) : (
                      operators.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{op.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {op._assignmentCount} {t("assignments.assigned")} • {op._activeEntryCount} {t("assignments.active")}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedOperatorData && operatorType === "profile" && (
                  <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                    <div className="text-sm font-medium">{selectedOperatorData.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {selectedOperatorData.username}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedOperatorData._assignmentCount} {t("assignments.assigned")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedOperatorData._activeEntryCount} {t("assignments.active")}
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Assign Action Card */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">3. {t("assignments.assignWork")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Select a part from available work</p>
              <p>✓ Choose an operator to assign</p>
              <p>✓ All operations will be assigned</p>
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedPart || !selectedOperator || assigning}
              className="w-full cta-button gap-2"
              size="lg"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("assignments.assigning")}
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  {t("assignments.assignWork")}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Assignments Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("assignments.currentAssignments")} ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="informational-text max-w-md mx-auto">
                {t("assignments.noActiveAssignments")}
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={assignments}
              searchPlaceholder={t("assignments.searchAssignments") || "Search assignments..."}
              pageSize={10}
              showToolbar={false}
              emptyMessage={t("assignments.noActiveAssignments")}
            />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
