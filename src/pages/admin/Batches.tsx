import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Filter, Layers, Play, CheckCircle2, XCircle, Eye, Trash2, FileEdit, CircleCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { Loader2 } from "lucide-react";
import { useBatches, useBatchStats, useDeleteBatch, useStartBatch, useCompleteBatch, useCancelBatch } from "@/hooks/useBatches";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { BatchStatus, BatchType, BatchFilters } from "@/types/batches";
import { BATCH_STATUS_CONFIG, BATCH_TYPE_CONFIG } from "@/types/batches";
import CreateBatchModal from "@/components/admin/CreateBatchModal";
import BatchDetailModal from "@/components/admin/BatchDetailModal";

export default function Batches() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [cellFilter, setCellFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalBatchId, setDetailModalBatchId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Build filters
  const filters: BatchFilters = useMemo(() => {
    const f: BatchFilters = {};
    if (statusFilter !== "all") f.status = [statusFilter as BatchStatus];
    if (typeFilter !== "all") f.batch_type = [typeFilter as BatchType];
    if (cellFilter !== "all") f.cell_id = cellFilter;
    if (searchQuery) f.search = searchQuery;
    return f;
  }, [statusFilter, typeFilter, cellFilter, searchQuery]);

  const { data: batches, isLoading } = useBatches(filters);
  const { data: stats } = useBatchStats();
  const deleteMutation = useDeleteBatch();
  const startMutation = useStartBatch();
  const completeMutation = useCompleteBatch();
  const cancelMutation = useCancelBatch();

  // Fetch cells for filter
  const { data: cells } = useQuery({
    queryKey: ["cells"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("id, name")
        .eq("active", true)
        .order("sequence");
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleStartBatch = async (id: string) => {
    await startMutation.mutateAsync(id);
  };

  const handleCompleteBatch = async (id: string) => {
    await completeMutation.mutateAsync(id);
  };

  const handleCancelBatch = async (id: string) => {
    await cancelMutation.mutateAsync(id);
  };

  const getStatusBadge = (status: BatchStatus) => {
    const config = BATCH_STATUS_CONFIG[status];
    return (
      <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border`}>
        {t(`batches.status.${status}`)}
      </Badge>
    );
  };

  const getTypeBadge = (type: BatchType) => {
    const config = BATCH_TYPE_CONFIG[type];
    return (
      <Badge variant="outline" className="text-xs">
        {t(`batches.types.${type}`)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("batches.title")}
        description={t("batches.subtitle")}
        action={{
          label: t("batches.createBatch"),
          onClick: () => setCreateModalOpen(true),
          icon: Plus,
        }}
      />

      {/* Stats */}
      <PageStatsRow
        stats={[
          {
            label: t("batches.stats.total"),
            value: stats?.total || 0,
            icon: Layers,
          },
          {
            label: t("batches.stats.draft"),
            value: stats?.draft || 0,
            icon: FileEdit,
          },
          {
            label: t("batches.stats.ready"),
            value: stats?.ready || 0,
            icon: CircleCheck,
          },
          {
            label: t("batches.stats.inProgress"),
            value: stats?.in_progress || 0,
            icon: Play,
            color: "warning",
          },
          {
            label: t("batches.stats.completed"),
            value: stats?.completed || 0,
            icon: CheckCircle2,
            color: "success",
          },
        ]}
      />

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("batches.searchBatches")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("batches.filters.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("batches.filters.allStatuses")}</SelectItem>
                  <SelectItem value="draft">{t("batches.status.draft")}</SelectItem>
                  <SelectItem value="ready">{t("batches.status.ready")}</SelectItem>
                  <SelectItem value="in_progress">{t("batches.status.in_progress")}</SelectItem>
                  <SelectItem value="completed">{t("batches.status.completed")}</SelectItem>
                  <SelectItem value="cancelled">{t("batches.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("batches.filters.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("batches.filters.allTypes")}</SelectItem>
                  <SelectItem value="laser_nesting">{t("batches.types.laser_nesting")}</SelectItem>
                  <SelectItem value="tube_batch">{t("batches.types.tube_batch")}</SelectItem>
                  <SelectItem value="saw_batch">{t("batches.types.saw_batch")}</SelectItem>
                  <SelectItem value="finishing_batch">{t("batches.types.finishing_batch")}</SelectItem>
                  <SelectItem value="general">{t("batches.types.general")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cellFilter} onValueChange={setCellFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("batches.filters.allCells")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("batches.filters.allCells")}</SelectItem>
                  {cells?.map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("batches.batchNumber")}</TableHead>
                <TableHead>{t("batches.batchType")}</TableHead>
                <TableHead>{t("batches.cell")}</TableHead>
                <TableHead>{t("batches.material")}</TableHead>
                <TableHead className="text-center">{t("batches.operationsCount")}</TableHead>
                <TableHead>{t("operations.status")}</TableHead>
                <TableHead>{t("batches.createdAt")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t("batches.noBatchesFound")}
                  </TableCell>
                </TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {batch.batch_number}
                    </TableCell>
                    <TableCell>{getTypeBadge(batch.batch_type)}</TableCell>
                    <TableCell>{batch.cell?.name || "-"}</TableCell>
                    <TableCell>
                      {batch.material ? (
                        <span>
                          {batch.material}
                          {batch.thickness_mm && ` (${batch.thickness_mm}mm)`}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{batch.operations_count}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      {format(new Date(batch.created_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailModalBatchId(batch.id)}
                          title={t("batches.viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {batch.status === "draft" || batch.status === "ready" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartBatch(batch.id)}
                            disabled={startMutation.isPending}
                            title={t("batches.startBatch")}
                          >
                            <Play className="h-4 w-4 text-status-active" />
                          </Button>
                        ) : null}

                        {batch.status === "in_progress" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCompleteBatch(batch.id)}
                              disabled={completeMutation.isPending}
                              title={t("batches.completeBatch")}
                            >
                              <CheckCircle2 className="h-4 w-4 text-status-completed" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelBatch(batch.id)}
                              disabled={cancelMutation.isPending}
                              title={t("batches.cancelBatch")}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : null}

                        {batch.status === "draft" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(batch.id)}
                            title={t("batches.deleteBatch")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Batch Modal */}
      <CreateBatchModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Batch Detail Modal */}
      <BatchDetailModal
        batchId={detailModalBatchId}
        onClose={() => setDetailModalBatchId(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("batches.deleteBatch")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("batches.deleteConfirm")}
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
