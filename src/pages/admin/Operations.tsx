import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Wrench, PlayCircle, CheckCircle2, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";
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
  const { t } = useTranslation();
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

  // Responsive column visibility - hide less important columns on mobile
  const { columnVisibility, isMobile } = useResponsiveColumns([
    { id: "operation_name", alwaysVisible: true },
    { id: "part_number", alwaysVisible: true },
    { id: "job_number", hideBelow: "md" },      // Hide on mobile
    { id: "cell", hideBelow: "lg" },            // Hide on mobile/tablet
    { id: "assigned_name", hideBelow: "md" },   // Hide on mobile
    { id: "status", alwaysVisible: true },
  ]);

  // Calculate stats
  const operationStats = useMemo(() => {
    if (!operations) return { total: 0, inProgress: 0, completed: 0, assigned: 0 };
    return {
      total: operations.length,
      inProgress: operations.filter((o: Operation) => o.status === "in_progress").length,
      completed: operations.filter((o: Operation) => o.status === "completed").length,
      assigned: operations.filter((o: Operation) => o.assigned_name !== null).length,
    };
  }, [operations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <AdminPageHeader
        title={t("operations.title", "Operations")}
        description={t("operations.subtitle", "Monitor all manufacturing operations across cells and jobs")}
        action={{
          label: t("common.export", "Export"),
          onClick: handleExport,
          icon: Download,
        }}
      />

      {/* Stats Row */}
      <PageStatsRow
        stats={[
          { label: t("operations.total", "Total Operations"), value: operationStats.total, icon: Wrench, color: "primary" },
          { label: t("operations.inProgress", "In Progress"), value: operationStats.inProgress, icon: PlayCircle, color: "warning" },
          { label: t("operations.completed", "Completed"), value: operationStats.completed, icon: CheckCircle2, color: "success" },
          { label: t("operations.assigned", "Assigned"), value: operationStats.assigned, icon: UserCheck, color: "info" },
        ]}
      />

      <div className="glass-card p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={operations}
          filterableColumns={filterableColumns}
          searchPlaceholder={t("operations.searchPlaceholder", "Search by part, operation, operator...")}
          emptyMessage={t("operations.noResults", "No operations match the current filters")}
          loading={isLoading}
          pageSize={isMobile ? 20 : 50}
          pageSizeOptions={[20, 50, 100, 200]}
          searchDebounce={250}
          onRowClick={(operation) => setSelectedOperationId(operation.id)}
          columnVisibility={columnVisibility}
          maxHeight={isMobile ? "calc(100vh - 320px)" : "calc(100vh - 280px)"}
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
