import React, { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, UserPlus, Download } from "lucide-react";
import { DataTable, DataTableColumnHeader, DataTableFilterableColumn } from "@/components/ui/data-table";

interface Operation {
  id: string;
  operation_name: string;
  status: string;
  part_id: string;
  part_number: string;
  job_id: string;
  job_number: string;
  cell: string;
  cell_color: string | null;
  assigned_operator_id: string | null;
  assigned_name: string | null;
  due_date: string | null;
}

export const Operations: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Load operations data
  useEffect(() => {
    loadOperations();
  }, [profile]);

  const loadOperations = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from("operations")
        .select(
          `
          id,
          operation_name,
          status,
          assigned_operator_id,
          part_id,
          parts (
            part_number,
            job_id,
            current_cell_id,
            jobs (
              job_number
            )
          ),
          cells (
            name,
            color
          ),
          profiles:assigned_operator_id (
            full_name,
            email
          )
        `,
        )
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (data) {
        const mappedOps: Operation[] = data.map((op: any) => ({
          id: op.id,
          operation_name: op.operation_name || "Unknown",
          status: op.status || "not_started",
          part_id: op.part_id,
          part_number: op.parts?.part_number || "Unknown",
          job_id: op.parts?.job_id || "",
          job_number: op.parts?.jobs?.job_number || "Unknown",
          cell: op.cells?.name || "Unknown",
          cell_color: op.cells?.color || null,
          assigned_operator_id: op.assigned_operator_id,
          assigned_name: op.profiles?.full_name || op.profiles?.email || null,
          due_date: null,
        }));

        setOperations(mappedOps);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading operations:", error);
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Operation", "Part", "Job", "Cell", "Assigned", "Status"].join(","),
      ...operations.map((op) =>
        [
          op.operation_name,
          op.part_number,
          op.job_number,
          op.cell,
          op.assigned_name || "-",
          op.status,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operations-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      not_started: "secondary",
      in_progress: "default",
      completed: "outline",
      on_hold: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const columns: ColumnDef<Operation>[] = useMemo(() => [
    {
      accessorKey: "operation_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Operation" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("operation_name")}</span>
      ),
    },
    {
      accessorKey: "part_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Part" />
      ),
      cell: ({ row }) => (
        <span
          className="text-primary cursor-pointer hover:underline"
          onClick={() => navigate("/admin/parts")}
        >
          #{row.getValue("part_number")}
        </span>
      ),
    },
    {
      accessorKey: "job_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Job" />
      ),
      cell: ({ row }) => (
        <span
          className="text-primary cursor-pointer hover:underline"
          onClick={() => navigate("/admin/jobs")}
        >
          JOB-{row.getValue("job_number")}
        </span>
      ),
    },
    {
      accessorKey: "cell",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cell" />
      ),
      cell: ({ row }) => {
        const op = row.original;
        return (
          <Badge
            variant="outline"
            style={{
              backgroundColor: op.cell_color ? `${op.cell_color}20` : '#f3f4f6',
              color: op.cell_color || '#374151',
              borderLeft: op.cell_color ? `3px solid ${op.cell_color}` : 'none',
            }}
          >
            {op.cell}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "assigned_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("assigned_name") as string | null;
        return name ? (
          <span>{name}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      },
      filterFn: (row, id, value) => {
        const assigned = row.getValue(id) as string | null;
        if (value.includes("assigned") && assigned) return true;
        if (value.includes("unassigned") && !assigned) return true;
        return false;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [navigate]);

  const uniqueCells = useMemo(() =>
    [...new Set(operations.map((op) => op.cell))],
    [operations]
  );

  const filterableColumns: DataTableFilterableColumn[] = useMemo(() => [
    {
      id: "cell",
      title: "Cell",
      options: uniqueCells.map((cell) => ({ label: cell, value: cell })),
    },
    {
      id: "status",
      title: "Status",
      options: [
        { label: "Not Started", value: "not_started" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "On Hold", value: "on_hold" },
      ],
    },
    {
      id: "assigned_name",
      title: "Assignment",
      options: [
        { label: "Assigned", value: "assigned" },
        { label: "Unassigned", value: "unassigned" },
      ],
    },
  ], [uniqueCells]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Showing {operations.length} operations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={operations}
        filterableColumns={filterableColumns}
        searchPlaceholder="Search by part, operation, operator..."
        pageSize={20}
        emptyMessage="No operations match the current filters"
      />
    </div>
  );
};
