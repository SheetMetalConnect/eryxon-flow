import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Plus,
  Clock,
  AlertCircle,
  Box,
  FileText,
  Eye,
  MoreHorizontal,
  Briefcase,
  Package,
  CheckCircle2,
  PauseCircle,
  Layers,
  AlertTriangle,
  TrendingUp,
  Trash2,
  AlertOctagon,
  Activity,
} from "lucide-react";
import { useQualityMetrics } from "@/hooks/useQualityMetrics";
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
import { useToast } from "@/hooks/use-toast";
import { JobIssueBadge } from "@/components/issues/JobIssueBadge";
import { CompactOperationsFlow } from "@/components/qrm/OperationsFlowVisualization";
import { useMultipleJobsRouting } from "@/hooks/useQRMMetrics";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
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

interface JobStats {
  total: number;
  inProgress: number;
  completed: number;
  onHold: number;
  overdue: number;
  dueThisWeek: number;
}

export default function Jobs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  // Calculate stats from jobs data
  const stats: JobStats = useMemo(() => {
    if (!jobs) return { total: 0, inProgress: 0, completed: 0, onHold: 0, overdue: 0, dueThisWeek: 0 };

    const today = new Date();
    const weekFromNow = addDays(today, 7);

    return {
      total: jobs.length,
      inProgress: jobs.filter((j: any) => j.status === "in_progress").length,
      completed: jobs.filter((j: any) => j.status === "completed").length,
      onHold: jobs.filter((j: any) => j.status === "on_hold").length,
      overdue: jobs.filter((j: any) => {
        const dueDate = new Date(j.due_date_override || j.due_date);
        return isBefore(dueDate, today) && j.status !== "completed";
      }).length,
      dueThisWeek: jobs.filter((j: any) => {
        const dueDate = new Date(j.due_date_override || j.due_date);
        return isAfter(dueDate, today) && isBefore(dueDate, weekFromNow) && j.status !== "completed";
      }).length,
    };
  }, [jobs]);

  // Get job IDs for routing fetch
  const jobIds = useMemo(() => jobs?.map((job: any) => job.id) || [], [jobs]);

  // Fetch routing for all jobs
  const { routings, loading: routingsLoading } = useMultipleJobsRouting(jobIds);

  // Fetch quality metrics
  const { data: qualityMetrics, isLoading: qualityLoading } = useQualityMetrics();

  const handleSetOnHold = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "on_hold" }).eq("id", jobId);
    refetch();
    toast({
      title: t("jobs.statusUpdated"),
      description: t("jobs.jobOnHold"),
    });
  };

  const handleResume = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "in_progress" }).eq("id", jobId);
    refetch();
    toast({
      title: t("jobs.statusUpdated"),
      description: t("jobs.jobResumed"),
    });
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
        toast({
          title: "Error",
          description: "Unsupported file type",
          variant: "destructive",
        });
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
      toast({
        title: "Error",
        description: "Failed to open file viewer",
        variant: "destructive",
      });
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

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("jobs.title")}
          </h1>
          <Button onClick={() => navigate("/admin/jobs/new")} className="cta-button">
            <Plus className="mr-2 h-4 w-4" /> {t("jobs.createJob")}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("jobs.subtitle", "Manage all jobs, track progress, and monitor deadlines")}
        </p>
      </div>

      <hr className="title-divider" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                <Briefcase className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">{t("jobs.total", "Total")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-info))]/10">
                <Layers className="h-4 w-4 text-[hsl(var(--color-info))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.inProgress}</div>
                <div className="text-xs text-muted-foreground">{t("operations.status.inProgress")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-success))]/10">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--color-success))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">{t("operations.status.completed")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                <PauseCircle className="h-4 w-4 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.onHold}</div>
                <div className="text-xs text-muted-foreground">{t("operations.status.onHold")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card transition-smooth hover:scale-[1.02]",
          stats.overdue > 0 && "border-[hsl(var(--color-error))]/30"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-error))]/10">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-error))]" />
              </div>
              <div>
                <div className={cn(
                  "text-xl font-bold",
                  stats.overdue > 0 && "text-[hsl(var(--color-error))]"
                )}>{stats.overdue}</div>
                <div className="text-xs text-muted-foreground">{t("jobs.overdue", "Overdue")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card transition-smooth hover:scale-[1.02]",
          stats.dueThisWeek > 0 && "border-[hsl(var(--color-warning))]/30"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                <Clock className="h-4 w-4 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className={cn(
                  "text-xl font-bold",
                  stats.dueThisWeek > 0 && "text-[hsl(var(--color-warning))]"
                )}>{stats.dueThisWeek}</div>
                <div className="text-xs text-muted-foreground">{t("jobs.dueThisWeek", "Due This Week")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics Dashboard */}
      {qualityMetrics && (qualityMetrics.totalProduced > 0 || qualityMetrics.issueMetrics.total > 0) && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              {t("quality.dashboardTitle", "Quality Overview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Yield Rate */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("quality.yieldRate", "Yield Rate")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.overallYield >= 95 ? "text-[hsl(var(--color-success))]" :
                  qualityMetrics.overallYield >= 85 ? "text-[hsl(var(--color-warning))]" :
                  "text-[hsl(var(--color-error))]"
                )}>
                  {qualityMetrics.overallYield.toFixed(1)}%
                </div>
              </div>

              {/* Total Produced */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {t("quality.totalProduced", "Produced")}
                </div>
                <div className="text-lg font-bold">{qualityMetrics.totalProduced.toLocaleString()}</div>
              </div>

              {/* Good Parts */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--color-success))]" />
                  {t("quality.goodParts", "Good")}
                </div>
                <div className="text-lg font-bold text-[hsl(var(--color-success))]">
                  {qualityMetrics.totalGood.toLocaleString()}
                </div>
              </div>

              {/* Scrap */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--color-error))]" />
                  {t("quality.scrap", "Scrap")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.totalScrap > 0 ? "text-[hsl(var(--color-error))]" : ""
                )}>
                  {qualityMetrics.totalScrap.toLocaleString()}
                  {qualityMetrics.scrapRate > 0 && (
                    <span className="text-xs font-normal ml-1">({qualityMetrics.scrapRate.toFixed(1)}%)</span>
                  )}
                </div>
              </div>

              {/* Open Issues */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--color-warning))]" />
                  {t("quality.openIssues", "Open Issues")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.issueMetrics.pending > 0 ? "text-[hsl(var(--color-warning))]" : ""
                )}>
                  {qualityMetrics.issueMetrics.pending}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    / {qualityMetrics.issueMetrics.total}
                  </span>
                </div>
              </div>

              {/* Critical Issues */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertOctagon className="h-3.5 w-3.5 text-[hsl(var(--color-error))]" />
                  {t("quality.critical", "Critical")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.issueMetrics.bySeverity.critical > 0 ? "text-[hsl(var(--color-error))]" : ""
                )}>
                  {qualityMetrics.issueMetrics.bySeverity.critical}
                </div>
              </div>
            </div>

            {/* Top Scrap Reasons Mini-Bar */}
            {qualityMetrics.topScrapReasons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-muted-foreground mb-2">
                  {t("quality.topScrapReasons", "Top Scrap Reasons")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {qualityMetrics.topScrapReasons.slice(0, 5).map((reason) => (
                    <Badge key={reason.code} variant="outline" className="text-xs">
                      {reason.code}: {reason.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Jobs Table */}
      <div className="glass-card p-4">
        <DataTable
          columns={columns}
          data={jobs || []}
          filterableColumns={filterableColumns}
          searchPlaceholder={t("jobs.searchJobs")}
          loading={isLoading}
          pageSize={20}
          emptyMessage={t("jobs.noJobsFound") || "No jobs found."}
          searchDebounce={200}
          onRowClick={(row) => setSelectedJobId(row.id)}
          compact={true}
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

      {/* File Viewer Dialog */}
      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="glass-card max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">{currentFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[75vh] rounded-lg overflow-hidden border border-white/10">
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
