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
import { Loader2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";

interface Part {
  id: string;
  part_number: string;
  material: string;
  status: string;
  current_cell_id: string | null;
  job: {
    job_number: string;
    customer: string | null;
  };
  _operationCount?: number;
}

interface Operator {
  id: string;
  full_name: string;
  username: string;
  _assignmentCount?: number;
  _activeEntryCount?: number;
}

interface Assignment {
  id: string;
  part_id: string;
  operator_id: string;
  created_at: string;
  part: {
    part_number: string;
    job: {
      job_number: string;
    };
  };
  operator: {
    full_name: string;
  };
  assigned_by_user: {
    full_name: string;
  };
}

export default function Assignments() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadData();
      setupRealtime();
    }
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
          job:jobs!inner(job_number, customer)
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

      // Load current assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(
          `
          id,
          part_id,
          operator_id,
          created_at,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          ),
          operator:profiles!assignments_operator_id_fkey(full_name),
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

      // Create assignment
      const { error: assignError } = await supabase.from("assignments").insert({
        tenant_id: profile.tenant_id,
        operator_id: selectedOperator,
        part_id: selectedPart,
        job_id: (part.job as any).id,
        assigned_by: profile.id,
        status: "assigned",
      });

      if (assignError) throw assignError;

      // Update all operations in this part
      const { error: operationError } = await supabase
        .from("operations")
        .update({ assigned_operator_id: selectedOperator })
        .eq("part_id", selectedPart)
        .eq("tenant_id", profile.tenant_id);

      if (operationError) throw operationError;

      toast.success(t("assignments.assignedSuccessfully"));
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
      cell: ({ row }) => row.original.part.job.job_number,
    },
    {
      accessorKey: "operator.full_name",
      id: "operator_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.assignedTo")} />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.operator.full_name}</Badge>
      ),
    },
    {
      accessorKey: "assigned_by_user.full_name",
      id: "assigned_by",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("assignments.assignedBy")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
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
        <span className="text-sm text-muted-foreground">
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
          >
            <X className="h-4 w-4" />
          </Button>
        );
      },
    },
  ], [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{t("assignments.title")}</h1>
        <p className="text-muted-foreground">{t("assignments.description")}</p>
      </div>

      {/* Assignment Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Parts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("assignments.availableParts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPart} onValueChange={setSelectedPart}>
              <SelectTrigger>
                <SelectValue placeholder={t("assignments.selectPart")} />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.part_number} • {part.job.job_number} • {part._operationCount} {t("assignments.operations")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPart && (
              <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                {parts.find((p) => p.id === selectedPart) && (
                  <>
                    <div className="text-sm font-medium">
                      {parts.find((p) => p.id === selectedPart)?.part_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("assignments.job")}: {parts.find((p) => p.id === selectedPart)?.job.job_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("assignments.material")}: {parts.find((p) => p.id === selectedPart)?.material}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("assignments.assignToOperator")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger>
                <SelectValue placeholder={t("assignments.selectOperator")} />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.full_name} • {op._assignmentCount} {t("assignments.assigned")} • {op._activeEntryCount} {t("assignments.active")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssign}
              disabled={!selectedPart || !selectedOperator || assigning}
              className="w-full mt-4"
              size="lg"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {assigning ? t("assignments.assigning") : t("assignments.assignWork")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("assignments.currentAssignments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("assignments.noActiveAssignments")}
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
