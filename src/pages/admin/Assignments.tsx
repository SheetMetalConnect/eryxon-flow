import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Part {
  id: string;
  part_number: string;
  material: string;
  status: string;
  current_stage_id: string | null;
  job: {
    job_number: string;
    customer: string | null;
  };
  _taskCount?: number;
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
        .select(`
          id,
          part_number,
          material,
          status,
          current_stage_id,
          job:jobs!inner(job_number, customer)
        `)
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "completed")
        .order("part_number");

      // Count tasks per part
      if (partsData) {
        const partsWithCounts = await Promise.all(
          partsData.map(async (part) => {
            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("part_id", part.id);
            return { ...part, _taskCount: count || 0 };
          })
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
            const [{ count: assignmentCount }, { count: activeCount }] = await Promise.all([
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
          })
        );
        setOperators(operatorsWithCounts);
      }

      // Load current assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(`
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
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "assigned")
        .order("created_at", { ascending: false });

      if (assignmentsData) setAssignments(assignmentsData as any);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error("Failed to load assignments");
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
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAssign = async () => {
    if (!selectedPart || !selectedOperator || !profile?.id || !profile?.tenant_id) {
      toast.error("Please select both a part and an operator");
      return;
    }

    setAssigning(true);
    try {
      const part = parts.find(p => p.id === selectedPart);
      if (!part) return;

      // Create assignment
      const { error: assignError } = await supabase
        .from("assignments")
        .insert({
          tenant_id: profile.tenant_id,
          operator_id: selectedOperator,
          part_id: selectedPart,
          job_id: (part.job as any).id,
          assigned_by: profile.id,
          status: "assigned",
        });

      if (assignError) throw assignError;

      // Update all tasks in this part
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ assigned_operator_id: selectedOperator })
        .eq("part_id", selectedPart)
        .eq("tenant_id", profile.tenant_id);

      if (taskError) throw taskError;

      toast.success("Work assigned successfully");
      setSelectedPart("");
      setSelectedOperator("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign work");
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

      // Clear assigned_operator_id from tasks
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ assigned_operator_id: null })
        .eq("part_id", partId)
        .eq("tenant_id", profile.tenant_id);

      if (taskError) throw taskError;

      toast.success("Assignment removed");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove assignment");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Work Assignments</h1>
          <p className="text-muted-foreground">Assign parts to specific operators</p>
        </div>

        {/* Assignment Interface */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Available Parts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPart} onValueChange={setSelectedPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a part to assign..." />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.part_number} • {part.job.job_number} • {part._taskCount} tasks
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPart && (
                <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                  {parts.find(p => p.id === selectedPart) && (
                    <>
                      <div className="text-sm font-medium">
                        {parts.find(p => p.id === selectedPart)?.part_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Job: {parts.find(p => p.id === selectedPart)?.job.job_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Material: {parts.find(p => p.id === selectedPart)?.material}
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
              <CardTitle className="text-lg">Assign To Operator</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.full_name} • {op._assignmentCount} assigned • {op._activeEntryCount} active
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
                {assigning ? "Assigning..." : "Assign Work"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Current Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active assignments
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Assigned By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.part.part_number}
                      </TableCell>
                      <TableCell>{assignment.part.job.job_number}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {assignment.operator.full_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assignment.assigned_by_user.full_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(assignment.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleRemoveAssignment(assignment.id, assignment.part_id)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
