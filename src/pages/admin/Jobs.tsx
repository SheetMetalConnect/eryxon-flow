import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Plus,
  Clock,
  AlertCircle,
  Box,
  FileText,
  Eye,
} from "lucide-react";
import { format, isBefore, addDays } from "date-fns";
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
import { useToast } from "@/hooks/use-toast";
import { JobIssueBadge } from "@/components/issues/JobIssueBadge";
import { CompactOperationsFlow } from "@/components/qrm/OperationsFlowVisualization";
import { useMultipleJobsRouting } from "@/hooks/useQRMMetrics";
import { DataTable, DataTableColumnHeader, DataTableFilterableColumn } from "@/components/ui/data-table";

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

  // Get job IDs for routing fetch
  const jobIds = useMemo(() => jobs?.map((job: any) => job.id) || [], [jobs]);

  // Fetch routing for all jobs
  const { routings, loading: routingsLoading } = useMultipleJobsRouting(jobIds);

  const handleSetOnHold = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "on_hold" }).eq("id", jobId);
    refetch();
  };

  const handleResume = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "in_progress" }).eq("id", jobId);
    refetch();
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      not_started: "secondary",
      in_progress: "default",
      completed: "outline",
      on_hold: "destructive",
    };
    const statusLabels: Record<string, string> = {
      not_started: t("operations.status.notStarted"),
      in_progress: t("operations.status.inProgress"),
      completed: t("operations.status.completed"),
      on_hold: t("operations.status.onHold"),
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getDueDateStyle = (job: any) => {
    const dueDate = new Date(job.due_date_override || job.due_date);
    const today = new Date();
    const weekFromNow = addDays(today, 7);

    if (isBefore(dueDate, today)) {
      return "text-destructive font-semibold";
    } else if (isBefore(dueDate, weekFromNow)) {
      return "text-warning font-semibold";
    }
    return "";
  };

  const columns: ColumnDef<JobData>[] = useMemo(() => [
    {
      accessorKey: "job_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.jobNumber")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("job_number")}</span>
      ),
    },
    {
      accessorKey: "customer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.customer")} />
      ),
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.dueDate")} />
      ),
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className={`flex items-center gap-2 ${getDueDateStyle(job)}`}>
            <Calendar className="h-4 w-4" />
            {format(new Date(job.due_date_override || job.due_date), "MMM dd, yyyy")}
            {job.due_date_override && (
              <Badge variant="outline" className="text-xs">
                {t("jobs.dueDate")}
              </Badge>
            )}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.due_date_override || rowA.original.due_date);
        const dateB = new Date(rowB.original.due_date_override || rowB.original.due_date);
        return dateA.getTime() - dateB.getTime();
      },
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
    },
    {
      id: "flow",
      header: t("qrm.flow", "Flow"),
      cell: ({ row }) => {
        const job = row.original;
        return (
          <CompactOperationsFlow
            routing={routings[job.id] || []}
            loading={routingsLoading}
          />
        );
      },
    },
    {
      accessorKey: "parts_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.parts")} />
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("parts_count")}</div>
      ),
    },
    {
      accessorKey: "operations_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("jobs.operations")} />
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("operations_count")}</div>
      ),
    },
    {
      id: "ncrs",
      header: "NCRs",
      cell: ({ row }) => <JobIssueBadge jobId={row.original.id} size="sm" />,
    },
    {
      id: "files",
      header: "Files",
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex gap-1">
            {job.hasSTEP && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFile(job.stepFiles[0]);
                }}
                title={`${job.stepFiles.length} STEP file(s)`}
              >
                <Box className="h-4 w-4 text-primary" />
              </Button>
            )}
            {job.hasPDF && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFile(job.pdfFiles[0]);
                }}
                title={`${job.pdfFiles.length} PDF file(s)`}
              >
                <FileText className="h-4 w-4 text-destructive" />
              </Button>
            )}
            {!job.hasSTEP && !job.hasPDF && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("common.edit"),
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedJobId(job.id);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setOverrideJobId(job.id);
              }}
            >
              <Clock className="h-4 w-4" />
            </Button>
            {job.status === "on_hold" ? (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResume(job.id);
                }}
              >
                {t("operations.startOperation")}
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetOnHold(job.id);
                }}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("jobs.title")}</h1>
        <Button onClick={() => navigate("/admin/jobs/new")}>
          <Plus className="mr-2 h-4 w-4" /> {t("jobs.createJob")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={jobs || []}
        filterableColumns={filterableColumns}
        searchPlaceholder={t("jobs.searchJobs")}
        loading={isLoading}
        pageSize={20}
        emptyMessage={t("jobs.noJobsFound") || "No jobs found."}
      />

      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={() => refetch()}
        />
      )}

      {overrideJobId && (
        <DueDateOverrideModal
          jobId={overrideJobId}
          onClose={() => setOverrideJobId(null)}
          onUpdate={() => refetch()}
        />
      )}

      {/* File Viewer Dialog */}
      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{currentFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[75vh]">
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
