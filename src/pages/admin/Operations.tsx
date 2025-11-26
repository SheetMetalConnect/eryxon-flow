import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Download, Wrench } from "lucide-react";
import { DataTable, DataTableColumnHeader, DataTableFilterableColumn } from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import OperationDetailModal from "@/components/admin/OperationDetailModal";

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
  resources_count: number;
  resource_names: string[];
}

export const Operations: React.FC = () => {
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Fetch operations using React Query
  const { data: operations = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-operations", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

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
        .order("created_at", { ascending: false });

      if (!data) return [];

      // Fetch resource counts and names for all operations
      const operationIds = data.map((op: any) => op.id);
      const { data: resourceData } = await supabase
        .from("operation_resources")
        .select(`
          operation_id,
          resource:resources(name)
        `)
        .in("operation_id", operationIds);

      // Build a map of operation_id -> resource info
      const resourceMap = new Map<string, { count: number; names: string[] }>();
      resourceData?.forEach((item: any) => {
        const opId = item.operation_id;
        const resourceName = item.resource?.name || "Unknown";

        if (!resourceMap.has(opId)) {
          resourceMap.set(opId, { count: 0, names: [] });
        }

        const info = resourceMap.get(opId)!;
        info.count += 1;
        info.names.push(resourceName);
      });

      return data.map((op: any) => {
        const resourceInfo = resourceMap.get(op.id) || { count: 0, names: [] };

        return {
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
          resources_count: resourceInfo.count,
          resource_names: resourceInfo.names,
        };
      }) as Operation[];
    },
    enabled: !!profile?.tenant_id,
  });

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
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.getValue("operation_name")}</span>
          {row.original.resources_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0">
                    <Wrench className="h-3 w-3 text-orange-600" />
                    {row.original.resources_count}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold mb-1">Required Resources:</p>
                    <ul className="list-disc list-inside">
                      {row.original.resource_names.map((name, idx) => (
                        <li key={idx}>{name}</li>
                      ))}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOperationId(row.original.id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Operations
          </h1>
          <Button onClick={handleExport} className="cta-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Monitor all manufacturing operations across cells and jobs
        </p>
      </div>

      <hr className="title-divider" />

      <div className="informational-text text-sm py-2">
        <Wrench className="inline h-4 w-4 mr-1.5 text-primary" />
        <strong>{operations.length} operations</strong> across all work centers and manufacturing cells
      </div>

      <div className="glass-card p-4">
        <DataTable
          columns={columns}
          data={operations}
          filterableColumns={filterableColumns}
          searchPlaceholder="Search by part, operation, operator..."
          emptyMessage="No operations match the current filters"
          loading={isLoading}
          pageSize={50}
          pageSizeOptions={[20, 50, 100, 200]}
          searchDebounce={250}
        />
      </div>

      {/* Operation Detail Modal */}
      {selectedOperationId && (
        <OperationDetailModal
          operationId={selectedOperationId}
          onClose={() => setSelectedOperationId(null)}
          onUpdate={() => refetch()}
        />
      )}
    </div>
  );
};
