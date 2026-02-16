import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Plus,
  Clock,
  Box,
  FileText,
  Eye,
  MoreHorizontal,
  Package,
  CheckCircle2,
  PauseCircle,
  Layers,
  Briefcase,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { format, isBefore, addDays, isAfter } from "date-fns";
import JobDetailModal from "@/components/admin/JobDetailModal";
import DueDateOverrideModal from "@/components/admin/DueDateOverrideModal";
import { STEPViewer } from "@/components/STEPViewer";
import { PDFViewer } from "@/components/PDFViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { JobIssueBadge } from "@/components/issues/JobIssueBadge";
import { CompactOperationsFlow } from "@/components/qrm/OperationsFlowVisualization";
import { useMultipleJobsRouting } from "@/hooks/useQRMMetrics";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";
import { cn } from "@/lib/utils";

interface JobData {
  id: string;
  job_number: string;
  customer: string;
  due_date: string;
  due_date_override: string | null;
  status: string;
  parts_count: number;
  operations_count: number;
  stepFiles: string[];
  pdfFiles: string[];
  hasSTEP: boolean;
  hasPDF: boolean;
}

export default function Jobs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [overrideJobId, setOverrideJobId] = useState<string | null>(null);

  // File viewer state
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<"step" | "pdf" | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");

  const {
    data: jobs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-jobs-all"],
    queryFn: async () => {
      const query = supabase.from("jobs").select(`
          *,
          parts(id, file_paths, operations(id))
        `);

      const { data, error } = await query;
      if (error) throw error;

      // Calculate counts and file information
      return data.map((job: any) => {
        const allFiles: string[] =
          job.parts?.flatMap((part: any) => part.file_paths || []) || [];
        const stepFiles = allFiles.filter((f) => {
          const ext = f.split(".").pop()?.toLowerCase();
          return ext === "step" || ext === "stp";
        });
        const pdfFiles = allFiles.filter(
          (f) => f.split(".").pop()?.toLowerCase() === "pdf",
        );

        return {
          ...job,
          parts_count: job.parts?.length || 0,
          operations_count:
            job.parts?.reduce(
              (sum: number, part: any) => sum + (part.operations?.length || 0),
              0,
            ) || 0,
          stepFiles,
          pdfFiles,
          hasSTEP: stepFiles.length > 0,
          hasPDF: pdfFiles.length > 0,
        };
      });
    },
  });

  // Get job IDs for routing fetch
  const jobIds = useMemo(() => jobs?.map((job: any) => job.id) || [], [jobs]);

  // Fetch routing for all jobs
  const { routings, loading: routingsLoading } = useMultipleJobsRouting(jobIds, profile?.tenant_id ?? null);

  const handleSetOnHold = async (jobId: string) => {
    const { error } = await supabase.from("jobs").update({ status: "on_hold" }).eq("id", jobId);
    if (error) {
      toast.error(t("notifications.error"), { description: error.message });
      return;
    }
    refetch();
    toast.success(t("jobs.statusUpdated"), { description: t("jobs.jobOnHold") });
  };

  const handleResume = async (jobId: string) => {
    const { error } = await supabase.from("jobs").update({ status: "in_progress" }).eq("id", jobId);
    if (error) {
      toast.error(t("notifications.error"), { description: error.message });
      return;
    }
    refetch();
    toast.success(t("jobs.statusUpdated"), { description: t("jobs.jobResumed") });
  };

  // Handle viewing file (STEP or PDF)
  const handleViewFile = async (filePath: string) => {
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

      // Create signed URL
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
    } catch (error: any) {
      console.error("Error opening file:", error);
      toast.error(t("notifications.error"), { description: t("notifications.failedToOpenFileViewer") });
    }
  };

  const handleFileDialogClose = () => {
    setFileViewerOpen(false);
    if (currentFileUrl && currentFileType === "step") {
      URL.revokeObjectURL(currentFileUrl);
    }
    setCurrentFileUrl(null);
    setCurrentFileType(null);
    setCurrentFileTitle("");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      not_started: { variant: "secondary", className: "bg-muted/50" },
      in_progress: { variant: "default", className: "bg-[hsl(var(--brand-primary))]/20 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/30" },
      completed: { variant: "outline", className: "bg-[hsl(var(--color-success))]/20 text-[hsl(var(--color-success))] border-[hsl(var(--color-success))]/30" },
      on_hold: { variant: "destructive", className: "bg-[hsl(var(--color-warning))]/20 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/30" },
    };
    const statusLabels: Record<string, string> = {
      not_started: t("operations.status.notStarted"),
      in_progress: t("operations.status.inProgress"),
      completed: t("operations.status.completed"),
      on_hold: t("operations.status.onHold"),
    };
    const { variant, className } = config[status] || config.not_started;
    return (
      <Badge variant={variant} className={cn("font-medium", className)}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getDueDateDisplay = (job: any) => {
    const dueDate = new Date(job.due_date_override || job.due_date);
    const today = new Date();
    const weekFromNow = addDays(today, 7);

    const isOverdue = isBefore(dueDate, today);
    const isDueSoon = !isOverdue && isBefore(dueDate, weekFromNow);

    return (
      <div className={cn(
        "flex items-center gap-1.5",
        isOverdue && "text-[hsl(var(--color-error))]",
        isDueSoon && "text-[hsl(var(--color-warning))]"
      )}>
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium">{format(dueDate, "MMM dd")}</span>
        {job.due_date_override && (
          <Clock className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    );
  };

  const columns: ColumnDef<JobData>[] = useMemo(() => [
    {
      accessorKey: "job_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.jobNumber")} />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.getValue("job_number")}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {row.original.customer || "-"}
          </span>
        </div>
      ),
      size: 140,
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.dueDate")} />
      ),
      cell: ({ row }) => getDueDateDisplay(row.original),
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.due_date_override || rowA.original.due_date);
        const dateB = new Date(rowB.original.due_date_override || rowB.original.due_date);
        return dateA.getTime() - dateB.getTime();
      },
      size: 100,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.status")} />
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      size: 120,
    },
    {
      id: "flow",
      header: t("qrm.flow", "Flow"),
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="min-w-[100px]">
            <CompactOperationsFlow
              routing={routings[job.id] || []}
              loading={routingsLoading}
            />
          </div>
        );
      },
      size: 140,
    },
    {
      id: "details",
      header: t("jobs.details", "Details"),
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title={t("jobs.parts")}>
              <Package className="h-3.5 w-3.5" />
              {job.parts_count}
            </span>
            <span className="flex items-center gap-1" title={t("jobs.operations")}>
              <Layers className="h-3.5 w-3.5" />
              {job.operations_count}
            </span>
            <JobIssueBadge jobId={job.id} size="sm" />
          </div>
        );
      },
      size: 140,
    },
    {
      id: "files",
      header: t("jobs.files", "Files"),
      cell: ({ row }) => {
        const job = row.original;
        if (!job.hasSTEP && !job.hasPDF) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex gap-1">
            {job.hasSTEP && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--brand-primary))]/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFile(job.stepFiles[0]);
                }}
                title={`${job.stepFiles.length} STEP file(s)`}
              >
                <Box className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              </Button>
            )}
            {job.hasPDF && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-[hsl(var(--color-error))]/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFile(job.pdfFiles[0]);
                }}
                title={`${job.pdfFiles.length} PDF file(s)`}
              >
                <FileText className="h-4 w-4 text-[hsl(var(--color-error))]" />
              </Button>
            )}
          </div>
        );
      },
      size: 80,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const job = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedJobId(job.id);
                }}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {t("common.viewDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setOverrideJobId(job.id);
                }}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                {t("jobs.overrideDueDate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {job.status === "on_hold" ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResume(job.id);
                  }}
                  className="gap-2 text-[hsl(var(--color-success))]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("jobs.resumeJob")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetOnHold(job.id);
                  }}
                  className="gap-2 text-[hsl(var(--color-warning))]"
                >
                  <PauseCircle className="h-4 w-4" />
                  {t("jobs.putOnHold")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [t, routings, routingsLoading]);

  const filterableColumns: DataTableFilterableColumn[] = useMemo(() => [
    {
      id: "status",
      title: t("jobs.status"),
      options: [
        { label: t("operations.status.notStarted"), value: "not_started" },
        { label: t("operations.status.inProgress"), value: "in_progress" },
        { label: t("operations.status.completed"), value: "completed" },
        { label: t("operations.status.onHold"), value: "on_hold" },
      ],
    },
  ], [t]);

  // Responsive column visibility - hide less important columns on mobile
  const { columnVisibility, isMobile } = useResponsiveColumns([
    { id: "job_number", alwaysVisible: true },
    { id: "due_date", alwaysVisible: true },
    { id: "status", alwaysVisible: true },
    { id: "flow", hideBelow: "lg" },      // Hide on mobile/tablet
    { id: "details", hideBelow: "md" },   // Hide on mobile
    { id: "files", hideBelow: "md" },     // Hide on mobile
    { id: "actions", alwaysVisible: true },
  ]);

  // Calculate stats
  const jobStats = useMemo(() => {
    if (!jobs) return { total: 0, active: 0, completed: 0, overdue: 0 };
    const today = new Date();
    return {
      total: jobs.length,
      active: jobs.filter((j: JobData) => j.status === "in_progress").length,
      completed: jobs.filter((j: JobData) => j.status === "completed").length,
      overdue: jobs.filter((j: JobData) => {
        const dueDate = new Date(j.due_date_override || j.due_date);
        return isBefore(dueDate, today) && j.status !== "completed";
      }).length,
    };
  }, [jobs]);

  return (
    <div className="p-4 space-y-4">
      <AdminPageHeader
        title={t("jobs.title")}
        description={t("jobs.subtitle", "Manage all jobs, track progress, and monitor deadlines")}
        action={{
          label: t("jobs.createJob"),
          onClick: () => navigate("/admin/jobs/new"),
          icon: Plus,
        }}
      />

      {/* Stats Row */}
      <PageStatsRow
        stats={[
          { label: t("jobs.totalJobs", "Total Jobs"), value: jobStats.total, icon: Briefcase, color: "primary" },
          { label: t("jobs.inProgress", "In Progress"), value: jobStats.active, icon: PlayCircle, color: "warning" },
          { label: t("jobs.completedJobs", "Completed"), value: jobStats.completed, icon: CheckCircle2, color: "success" },
          { label: t("jobs.overdueJobs", "Overdue"), value: jobStats.overdue, icon: AlertCircle, color: jobStats.overdue > 0 ? "error" : "muted" },
        ]}
      />

      {/* Jobs Table */}
      <div className="glass-card p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={jobs || []}
          filterableColumns={filterableColumns}
          searchPlaceholder={t("jobs.searchJobs")}
          loading={isLoading}
          pageSize={isMobile ? 10 : 20}
          emptyMessage={t("jobs.noJobsFound") || "No jobs found."}
          searchDebounce={200}
          onRowClick={(row) => setSelectedJobId(row.id)}
          compact={true}
          columnVisibility={columnVisibility}
          maxHeight={isMobile ? "calc(100vh - 320px)" : "calc(100vh - 280px)"}
        />
      </div>

      {/* Job Detail Modal */}
      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={() => refetch()}
        />
      )}

      {/* Due Date Override Modal */}
      {overrideJobId && (
        <DueDateOverrideModal
          jobId={overrideJobId}
          onClose={() => setOverrideJobId(null)}
          onUpdate={() => refetch()}
        />
      )}

      {/* File Viewer Dialog - Responsive */}
      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="glass-card w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl flex flex-col p-0 rounded-none sm:rounded-lg inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
            <DialogTitle className="text-sm sm:text-base pr-8 truncate">{currentFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 rounded-lg border border-white/10 m-2 sm:m-4">
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
