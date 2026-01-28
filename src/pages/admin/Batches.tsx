import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  MoreHorizontal,
  Layers,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  XCircle,
  Scissors,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useBatches, useUpdateBatchStatus, useDeleteBatch, type Batch, type BatchStatus, type BatchType } from "@/hooks/useBatches";
import { cn } from "@/lib/utils";

const BATCH_TYPE_CONFIG: Record<BatchType, { label: string; icon: any; color: string }> = {
  laser_nesting: { label: "batches.types.laserNesting", icon: Scissors, color: "text-orange-500" },
  tube_batch: { label: "batches.types.tubeBatch", icon: CircleDot, color: "text-blue-500" },
  saw_batch: { label: "batches.types.sawBatch", icon: Scissors, color: "text-yellow-500" },
  finishing_batch: { label: "batches.types.finishingBatch", icon: CheckCircle2, color: "text-green-500" },
  general: { label: "batches.types.general", icon: Layers, color: "text-gray-500" },
};

const STATUS_CONFIG: Record<BatchStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "batches.status.draft", variant: "outline" },
  ready: { label: "batches.status.ready", variant: "secondary" },
  in_progress: { label: "batches.status.inProgress", variant: "default" },
  completed: { label: "batches.status.completed", variant: "secondary" },
  cancelled: { label: "batches.status.cancelled", variant: "destructive" },
  blocked: { label: "batches.status.blocked", variant: "destructive" },
};

export default function Batches() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: batches, isLoading } = useBatches();
  const updateStatus = useUpdateBatchStatus();
  const deleteBatch = useDeleteBatch();

  // Calculate stats
  const stats = {
    total: batches?.length || 0,
    draft: batches?.filter(b => b.status === "draft").length || 0,
    inProgress: batches?.filter(b => b.status === "in_progress").length || 0,
    completed: batches?.filter(b => b.status === "completed").length || 0,
  };

  const handleStatusChange = (batchId: string, newStatus: BatchStatus) => {
    updateStatus.mutate({ batchId, status: newStatus });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBatch.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "batch_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.batchNumber")} />
      ),
      cell: ({ row }) => (
        <div className="font-mono font-medium">{row.getValue("batch_number")}</div>
      ),
    },
    {
      accessorKey: "batch_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.type")} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("batch_type") as BatchType;
        const config = BATCH_TYPE_CONFIG[type];
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span>{t(config.label)}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "cell",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.cell")} />
      ),
      cell: ({ row }) => {
        const cell = row.original.cell;
        return cell?.name || "-";
      },
    },
    {
      accessorKey: "material",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.material")} />
      ),
      cell: ({ row }) => {
        const material = row.getValue("material") as string | null;
        const thickness = row.original.thickness_mm;
        if (!material) return "-";
        return (
          <div>
            {material}
            {thickness && <span className="text-muted-foreground ml-1">({thickness}mm)</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "operations_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.operationsCount")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("operations_count")}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.status.label")} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as BatchStatus;
        const config = STATUS_CONFIG[status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("batches.createdAt")} />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return format(new Date(date), "dd/MM/yyyy HH:mm");
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const batch = row.original;
        const canStart = batch.status === "draft" || batch.status === "ready";
        const canComplete = batch.status === "in_progress";
        const canCancel = batch.status !== "completed" && batch.status !== "cancelled";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/admin/batches/${batch.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                {t("common.view")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canStart && (
                <DropdownMenuItem onClick={() => handleStatusChange(batch.id, "in_progress")}>
                  <Play className="mr-2 h-4 w-4" />
                  {t("batches.actions.start")}
                </DropdownMenuItem>
              )}
              {canComplete && (
                <DropdownMenuItem onClick={() => handleStatusChange(batch.id, "completed")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("batches.actions.complete")}
                </DropdownMenuItem>
              )}
              {canCancel && (
                <DropdownMenuItem onClick={() => handleStatusChange(batch.id, "cancelled")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("batches.actions.cancel")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteId(batch.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const filterableColumns: DataTableFilterableColumn<Batch>[] = [
    {
      id: "batch_type",
      title: t("batches.type"),
      options: Object.entries(BATCH_TYPE_CONFIG).map(([value, config]) => ({
        label: t(config.label),
        value,
      })),
    },
    {
      id: "status",
      title: t("batches.status.label"),
      options: Object.entries(STATUS_CONFIG).map(([value, config]) => ({
        label: t(config.label),
        value,
      })),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("batches.title")}
        description={t("batches.description")}
        action={
          <Button onClick={() => navigate("/admin/batches/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("batches.createBatch")}
          </Button>
        }
      />

      <PageStatsRow
        stats={[
          {
            label: t("batches.stats.total"),
            value: stats.total,
            icon: Layers,
          },
          {
            label: t("batches.stats.draft"),
            value: stats.draft,
            icon: Clock,
          },
          {
            label: t("batches.stats.inProgress"),
            value: stats.inProgress,
            icon: Play,
          },
          {
            label: t("batches.stats.completed"),
            value: stats.completed,
            icon: CheckCircle2,
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={batches || []}
        filterableColumns={filterableColumns}
        searchableColumns={[
          { id: "batch_number", title: t("batches.batchNumber") },
          { id: "material", title: t("batches.material") },
        ]}
        isLoading={isLoading}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("batches.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("batches.deleteConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
