import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { QueryKeys } from "@/lib/queryClient";
import { useProfile } from "@/hooks/useProfile";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import PartDetailModal from "@/components/admin/PartDetailModal";
import {
  Package,
  ChevronRight,
  Box,
  FileText,
  Eye,
  Layers,
  PlayCircle,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PartFlowCell } from "@/components/PartFlowCell";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";

interface PartData {
  id: string;
  part_number: string;
  material: string;
  status: string;
  parent_part_id: string | null;
  job?: { job_number: string };
  cell?: { name: string; color: string };
  operations_count: number;
  has_children: boolean;
  stepFiles: string[];
  pdfFiles: string[];
  hasSTEP: boolean;
  hasPDF: boolean;
}

interface PartRow {
  id: string;
  part_number: string;
  material: string | null;
  status: string;
  parent_part_id: string | null;
  file_paths: string[] | null;
  job: { job_number: string } | null;
  cell: { name: string; color: string } | null;
  operations: { count: number }[];
}

export default function Parts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<"step" | "pdf" | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");

  const { data: materials } = useQuery({
    queryKey: QueryKeys.config.materials(profile?.tenant_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("material")
        .not("material", "is", null);

      if (error) throw error;

      const uniqueMaterials = [...new Set(data.map((p) => p.material))];
      return uniqueMaterials.sort();
    },
  });

  const { data: jobs } = useQuery({
    queryKey: QueryKeys.jobs.list(profile?.tenant_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number")
        .order("job_number");

      if (error) throw error;
      return data;
    },
  });

  const {
    data: parts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QueryKeys.parts.all(profile?.tenant_id ?? ''),
    queryFn: async () => {
      const query = supabase.from("parts").select(`
          *,
          job:jobs(job_number),
          cell:cells(name, color),
          operations(count)
        `);

      const { data, error } = await query;
      if (error) throw error;

      // Build children set from already-fetched data (no second query needed)
      const partsWithChildren = new Set(
        (data as PartRow[])?.filter((p) => p.parent_part_id).map((p) => p.parent_part_id) || [],
      );

      return (data as PartRow[]).map((part) => {
        const files = part.file_paths || [];
        const stepFiles = files.filter((f: string) => {
          const ext = f.split(".").pop()?.toLowerCase();
          return ext === "step" || ext === "stp";
        });
        const pdfFiles = files.filter(
          (f: string) => f.split(".").pop()?.toLowerCase() === "pdf",
        );

        return {
          ...part,
          operations_count: part.operations?.[0]?.count || 0,
          has_children: partsWithChildren.has(part.id),
          stepFiles,
          pdfFiles,
          hasSTEP: stepFiles.length > 0,
          hasPDF: pdfFiles.length > 0,
        };
      });
    },
  });

  const handleViewFile = useCallback(async (filePath: string) => {
    try {
      const fileExt = filePath.split(".").pop()?.toLowerCase();
      const fileType =
        fileExt === "pdf"
          ? "pdf"
          : fileExt === "step" || fileExt === "stp"
            ? "step"
            : null;

      if (!fileType) {
        toast.error(t("notifications.error"), { description: t("notifications.unsupportedFileType") });
        return;
      }

      const { data, error } = await supabase.storage
        .from("parts-cad")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

      // For STEP files, fetch as blob to avoid CORS issues
      let viewUrl = data.signedUrl;
      if (fileType === "step") {
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        viewUrl = URL.createObjectURL(blob);
      }

      const fileName = filePath.split("/").pop() || "File";
      setCurrentFileUrl(viewUrl);
      setCurrentFileType(fileType);
      setCurrentFileTitle(fileName);
      setFileViewerOpen(true);
    } catch (error: unknown) {
      logger.error('Parts', 'Error opening file', error);
      toast.error(t("notifications.error"), { description: t("notifications.failedToOpenFileViewer") });
    }
  }, [t]);

  const handleFileDialogClose = () => {
    setFileViewerOpen(false);
    if (currentFileUrl && currentFileType === "step") {
      URL.revokeObjectURL(currentFileUrl);
    }
    setCurrentFileUrl(null);
    setCurrentFileType(null);
    setCurrentFileTitle("");
  };

  const getStatusBadge = useCallback((status: string) => {
    const badgeStatus: Record<string, "pending" | "active" | "completed" | "on-hold"> = {
      not_started: "pending",
      in_progress: "active",
      completed: "completed",
      on_hold: "on-hold",
    };
    return (
      <StatusBadge
        status={badgeStatus[status] || "pending"}
        label={status.replaceAll("_", " ")}
      />
    );
  }, []);

  const columns: ColumnDef<PartData>[] = useMemo(() => [
    {
      accessorKey: "part_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parts.partNumber")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("part_number")}</span>
      ),
    },
    {
      id: "type",
      header: t("parts.type"),
      cell: ({ row }) => {
        const part = row.original;
        return (
          <div className="flex gap-1">
            {part.has_children && (
              <Badge variant="outline" className="text-xs" title={t("parts.assemblyTooltip")}>
                <Package className="h-3 w-3 mr-1" />
                {t("parts.assembly")}
              </Badge>
            )}
            {part.parent_part_id && (
              <Badge variant="secondary" className="text-xs" title={t("parts.componentTooltip")}>
                <ChevronRight className="h-3 w-3 mr-1" />
                {t("parts.component")}
              </Badge>
            )}
            {!part.has_children && !part.parent_part_id && (
              <span className="text-xs text-muted-foreground">{t("parts.standalone")}</span>
            )}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const part = row.original;
        if (value.includes("assemblies") && part.has_children) return true;
        if (value.includes("components") && part.parent_part_id) return true;
        if (value.includes("standalone") && !part.has_children && !part.parent_part_id) return true;
        return false;
      },
    },
    {
      accessorKey: "job.job_number",
      id: "job_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parts.jobNumber")} />
      ),
      cell: ({ row }) => row.original.job?.job_number || "-",
      filterFn: (row, id, value) => {
        const jobNumber = row.original.job?.job_number;
        return value.includes(jobNumber);
      },
    },
    {
      accessorKey: "material",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parts.material")} />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parts.status.title")} />
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "cell",
      header: t("parts.currentCell"),
      cell: ({ row }) => {
        const part = row.original;
        return part.cell ? (
          <Badge
            variant="outline"
            style={{
              borderColor: part.cell.color,
              backgroundColor: `${part.cell.color}20`,
            }}
          >
            {part.cell.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">{t("parts.notStarted")}</span>
        );
      },
    },
    {
      id: "route",
      header: t("qrm.flow", "Route"),
      cell: ({ row }) => <PartFlowCell partId={row.original.id} />,
      size: 140,
    },
    {
      accessorKey: "operations_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parts.operations")} />
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("operations_count")}</div>
      ),
    },
    {
      id: "files",
      header: "Files",
      cell: ({ row }) => {
        const part = row.original;
        return (
          <div className="flex gap-1">
            {part.hasSTEP && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFile(part.stepFiles[0]);
                }}
                title={`${part.stepFiles.length} STEP file(s)`}
              >
                <Box className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {part.hasPDF && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFile(part.pdfFiles[0]);
                }}
                title={`${part.pdfFiles.length} PDF file(s)`}
              >
                <FileText className="h-4 w-4 text-red-600" />
              </Button>
            )}
            {!part.hasSTEP && !part.hasPDF && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("parts.actions"),
      cell: ({ row }) => {
        const part = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPartId(part.id);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("parts.viewDetails")}
          </Button>
        );
      },
    },
  ], [getStatusBadge, handleViewFile, t]);

  const filterableColumns: DataTableFilterableColumn[] = useMemo(() => [
    {
      id: "status",
      title: t("parts.status.title"),
      options: [
        { label: t("parts.status.notStarted"), value: "not_started" },
        { label: t("parts.status.inProgress"), value: "in_progress" },
        { label: t("parts.status.onHold", "On hold"), value: "on_hold" },
        { label: t("parts.status.completed"), value: "completed" },
      ],
    },
    {
      id: "material",
      title: t("parts.material"),
      options: (materials || []).map((m) => ({ label: m, value: m })),
    },
    {
      id: "job_number",
      title: t("parts.jobNumber"),
      options: (jobs || []).map((j) => ({ label: j.job_number, value: j.job_number })),
    },
    {
      id: "type",
      title: t("parts.type"),
      options: [
        { label: t("parts.assembliesHasChildren"), value: "assemblies" },
        { label: t("parts.componentsHasParent"), value: "components" },
        { label: t("parts.standaloneParts"), value: "standalone" },
      ],
    },
  ], [t, materials, jobs]);

  const { columnVisibility, isMobile } = useResponsiveColumns([
    { id: "part_number", alwaysVisible: true },
    { id: "type", hideBelow: "lg" },           // Hide on mobile/tablet
    { id: "job_number", alwaysVisible: true },
    { id: "material", hideBelow: "md" },       // Hide on mobile
    { id: "status", alwaysVisible: true },
    { id: "cell", hideBelow: "lg" },           // Hide on mobile/tablet
    { id: "operations_count", hideBelow: "md" }, // Hide on mobile
    { id: "files", hideBelow: "md" },          // Hide on mobile
    { id: "actions", alwaysVisible: true },
  ]);

  const partStats = useMemo(() => {
    if (!parts) return { total: 0, active: 0, completed: 0, assemblies: 0 };
    return {
      total: parts.length,
      active: parts.filter((p: PartData) => p.status === "in_progress").length,
      completed: parts.filter((p: PartData) => p.status === "completed").length,
      assemblies: parts.filter((p: PartData) => p.has_children).length,
    };
  }, [parts]);

  return (
    <div className="p-4 space-y-4">
      <AdminPageHeader
        title={t("parts.title")}
        description={t("parts.subtitle")}
        action={
          <Button onClick={() => navigate("/admin/parts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("parts.createPart")}
          </Button>
        }
      />

      <PageStatsRow
        stats={[
          { label: t("parts.totalParts", "Total Parts"), value: partStats.total, icon: Package, color: "primary" },
          { label: t("parts.inProgress", "In Progress"), value: partStats.active, icon: PlayCircle, color: "warning" },
          { label: t("parts.completed", "Completed"), value: partStats.completed, icon: CheckCircle2, color: "success" },
          { label: t("parts.assemblies", "Assemblies"), value: partStats.assemblies, icon: Layers, color: "info" },
        ]}
      />

      <div className="glass-card p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={parts || []}
          filterableColumns={filterableColumns}
          searchPlaceholder={t("parts.searchByPartNumber")}
          loading={isLoading}
          pageSize={isMobile ? 10 : 20}
          emptyMessage={t("parts.noPartsFound")}
          searchDebounce={200}
          columnVisibility={columnVisibility}
          onRowClick={(row) => setSelectedPartId(row.id)}
          maxHeight={isMobile ? "calc(100vh - 320px)" : "calc(100vh - 280px)"}
        />
      </div>

      {selectedPartId && (
        <PartDetailModal
          partId={selectedPartId}
          onClose={() => setSelectedPartId(null)}
          onUpdate={() => refetch()}
        />
      )}

      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl flex flex-col p-0 gap-0 border-0 bg-transparent shadow-2xl rounded-none sm:rounded-xl overflow-hidden inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <div className="relative flex-1 min-h-0 bg-background sm:rounded-xl overflow-hidden">
            <div className="absolute top-2 left-3 z-10 max-w-[60%]">
              <span className="text-[11px] text-muted-foreground/70 font-medium truncate block">{currentFileTitle}</span>
            </div>
            <DialogTitle className="sr-only">{currentFileTitle}</DialogTitle>
            {currentFileType === "step" && currentFileUrl && (
              <STEPViewer url={currentFileUrl} />
            )}
            {currentFileType === "pdf" && currentFileUrl && (
              <PDFViewer url={currentFileUrl} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
