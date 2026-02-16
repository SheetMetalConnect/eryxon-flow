import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  Box,
  FileText,
  User,
  Clock,
  Wrench,
  CheckCircle,
  Pause,
  Play,
  AlertCircle,
  MapPin,
  Save,
  Package,
  Settings2,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { STEPViewer } from "@/components/STEPViewer";
import { PDFViewer } from "@/components/PDFViewer";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface OperationDetailModalProps {
  operationId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function OperationDetailModal({
  operationId,
  onClose,
  onUpdate,
}: OperationDetailModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<"step" | "pdf" | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");

  // Fetch operation details with part and job info
  const { data: operation, isLoading } = useQuery({
    queryKey: ["operation-detail", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select(`
          *,
          parts (
            id,
            part_number,
            material,
            quantity,
            file_paths,
            jobs (
              id,
              job_number,
              customer,
              due_date
            )
          ),
          cells (
            id,
            name,
            color
          ),
          profiles:assigned_operator_id (
            id,
            full_name,
            email
          )
        `)
        .eq("id", operationId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch resources for this operation with full details
  const { data: resources } = useQuery({
    queryKey: ["operation-resources", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_resources")
        .select(`
          id,
          quantity,
          notes,
          resource:resources (
            id,
            name,
            type,
            identifier,
            location,
            status
          )
        `)
        .eq("operation_id", operationId);

      if (error) throw error;
      return data;
    },
  });

  // Fetch available operators for assignment
  const { data: operators } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("tenant_id", profile?.tenant_id)
        .in("role", ["operator", "admin"]);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Mutation to update operation status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "not_started" | "in_progress" | "completed" | "on_hold") => {
      const { error } = await supabase
        .from("operations")
        .update({ status: newStatus })
        .eq("id", operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-detail", operationId] });
      onUpdate();
      toast.success(t("notifications.updated"), {
        description: t("operations.statusUpdatedDesc"),
      });
    },
    onError: (error: Error) => {
      toast.error(t("notifications.error"), {
        description: error.message,
      });
    },
  });

  // Mutation to assign operator
  const assignOperatorMutation = useMutation({
    mutationFn: async (operatorId: string | null) => {
      const { error } = await supabase
        .from("operations")
        .update({ assigned_operator_id: operatorId })
        .eq("id", operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-detail", operationId] });
      onUpdate();
      toast.success(t("notifications.updated"), {
        description: t("operations.operatorAssignedDesc"),
      });
    },
    onError: (error: Error) => {
      toast.error(t("notifications.error"), {
        description: error.message,
      });
    },
  });

  // Handle viewing file (STEP or PDF)
  const handleViewFile = async (filePath: string) => {
    try {
      const fileExt = filePath.split(".").pop()?.toLowerCase();
      const fileType =
        fileExt === "pdf" ? "pdf" : fileExt === "step" || fileExt === "stp" ? "step" : null;

      if (!fileType) {
        toast.error(t("notifications.error"), {
          description: t("notifications.unsupportedFileType"),
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from("parts-cad")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

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
      toast.error(t("notifications.error"), {
        description: t("notifications.failedToOpenFileViewer"),
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
    const labels: Record<string, string> = {
      not_started: t("operations.status.notStarted"),
      in_progress: t("operations.status.inProgress"),
      completed: t("operations.status.completed"),
      on_hold: t("operations.status.onHold"),
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  // Get file lists from part
  const stepFiles =
    operation?.parts?.file_paths?.filter((f: string) => {
      const ext = f.split(".").pop()?.toLowerCase();
      return ext === "step" || ext === "stp";
    }) || [];
  const pdfFiles =
    operation?.parts?.file_paths?.filter(
      (f: string) => f.split(".").pop()?.toLowerCase() === "pdf"
    ) || [];

  // Count files for tab badge
  const filesCount = stepFiles.length + pdfFiles.length;
  const resourcesCount = resources?.length || 0;

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl lg:max-w-2xl">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-semibold truncate">
                  {operation?.operation_name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  <span>#{operation?.parts?.part_number}</span>
                  <span>·</span>
                  <span>JOB-{operation?.parts?.jobs?.job_number}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(operation?.status)}
                {operation?.cells && (
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: operation.cells.color ? `${operation.cells.color}20` : undefined,
                      borderColor: operation.cells.color || undefined,
                    }}
                  >
                    {operation.cells.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Content with Tabs */}
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 border-b">
              <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-4 overflow-x-auto">
                <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 shrink-0">
                  <Settings2 className="h-4 w-4 mr-1.5" />
                  {t("common.details", "Details")}
                </TabsTrigger>
                {resourcesCount > 0 && (
                  <TabsTrigger value="resources" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 shrink-0">
                    <Wrench className="h-4 w-4 mr-1.5" />
                    {t("operations.resources", "Resources")} ({resourcesCount})
                  </TabsTrigger>
                )}
                {filesCount > 0 && (
                  <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 shrink-0">
                    <Paperclip className="h-4 w-4 mr-1.5" />
                    {t("parts.files", "Files")} ({filesCount})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Details Tab */}
              <TabsContent value="details" className="p-4 sm:p-6 space-y-5 m-0">
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("jobs.dueDate")}</p>
                    <p className="mt-1 font-semibold text-sm">
                      {operation?.parts?.jobs?.due_date
                        ? format(new Date(operation.parts.jobs.due_date), "MMM dd, yyyy")
                        : "-"
                      }
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("operations.estimatedTime", "Est. Time")}</p>
                    <p className="mt-1 font-semibold text-sm">
                      {operation?.estimated_time ? `${operation.estimated_time} min` : "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.material", "Material")}</p>
                    <p className="mt-1 font-semibold text-sm truncate">
                      {operation?.parts?.material || "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.quantity", "Quantity")}</p>
                    <p className="mt-1 font-semibold text-sm">
                      {operation?.parts?.quantity || "-"}
                    </p>
                  </div>
                </div>

                {/* Part & Job Context */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{t("operations.context", "Context")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">#{operation?.parts?.part_number}</p>
                      <p className="text-xs text-muted-foreground">{t("parts.partNumber", "Part Number")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{operation?.parts?.jobs?.customer}</p>
                      <p className="text-xs text-muted-foreground">{t("jobs.customer", "Customer")}</p>
                    </div>
                  </div>
                </div>

                {/* Assignment */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t("operations.assignedOperator", "Assigned Operator")}</Label>
                  <Select
                    value={operation?.assigned_operator_id || "unassigned"}
                    onValueChange={(value) =>
                      assignOperatorMutation.mutate(value === "unassigned" ? null : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("operations.selectOperator", "Select operator")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground">{t("operations.unassigned", "Unassigned")}</span>
                      </SelectItem>
                      {operators?.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          <span className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {op.full_name || op.email}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                {operation?.notes && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t("jobs.notes", "Notes")}</Label>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg border">
                      {operation.notes}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {operation?.status !== "completed" && (
                    <>
                      {operation?.status === "not_started" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate("in_progress")}
                          className="gap-1.5"
                        >
                          <Play className="h-4 w-4" />
                          {t("operations.start", "Start")}
                        </Button>
                      )}
                      {operation?.status === "in_progress" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate("on_hold")}
                            className="gap-1.5"
                          >
                            <Pause className="h-4 w-4" />
                            {t("operations.hold", "Hold")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate("completed")}
                            className="gap-1.5"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {t("operations.complete", "Complete")}
                          </Button>
                        </>
                      )}
                      {operation?.status === "on_hold" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate("in_progress")}
                          className="gap-1.5"
                        >
                          <Play className="h-4 w-4" />
                          {t("operations.resume", "Resume")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Resources Tab */}
              {resourcesCount > 0 && (
                <TabsContent value="resources" className="p-4 sm:p-6 space-y-3 m-0">
                  {resources?.map((r: any) => {
                    const statusColors: Record<string, string> = {
                      available: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
                      in_use: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
                      maintenance: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
                      retired: "text-muted-foreground bg-muted/50 border-muted",
                    };
                    const getStatusLabel = (status: string) => {
                      const labels: Record<string, string> = {
                        available: t("terminal.resources.status.available"),
                        in_use: t("terminal.resources.status.inUse"),
                        maintenance: t("terminal.resources.status.maintenance"),
                        retired: t("terminal.resources.status.retired"),
                      };
                      return labels[status] || status;
                    };
                    return (
                      <div key={r.id} className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-orange-500 shrink-0" />
                              <span className="font-medium">{r.resource?.name}</span>
                              {r.quantity > 1 && (
                                <Badge variant="secondary" className="text-xs">×{r.quantity}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-2 space-y-1">
                              <p className="capitalize">{t("operations.type")}: {r.resource?.type?.replace("_", " ")}</p>
                              {r.resource?.identifier && <p>ID: {r.resource.identifier}</p>}
                              {r.resource?.location && (
                                <p className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {r.resource.location}
                                </p>
                              )}
                            </div>
                          </div>
                          {r.resource?.status && (
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${statusColors[r.resource.status] || ""}`}
                            >
                              {getStatusLabel(r.resource.status)}
                            </Badge>
                          )}
                        </div>
                        {r.notes && (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <span className="text-amber-700 dark:text-amber-300">{r.notes}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>
              )}

              {/* Files Tab */}
              {filesCount > 0 && (
                <TabsContent value="files" className="p-4 sm:p-6 space-y-4 m-0">
                  {stepFiles.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Box className="h-4 w-4 text-primary" />
                        {t("parts.cadFiles", "CAD Files")} ({stepFiles.length})
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stepFiles.map((file: string, idx: number) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFile(file)}
                            className="justify-start gap-2 h-auto py-2.5"
                          >
                            <Box className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{file.split("/").pop()}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {pdfFiles.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <FileText className="h-4 w-4 text-destructive" />
                        {t("parts.documents", "Documents")} ({pdfFiles.length})
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {pdfFiles.map((file: string, idx: number) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFile(file)}
                            className="justify-start gap-2 h-auto py-2.5"
                          >
                            <FileText className="h-4 w-4 text-destructive shrink-0" />
                            <span className="truncate">{file.split("/").pop()}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog - Full screen on mobile */}
      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="glass-card w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl flex flex-col p-0 rounded-none sm:rounded-lg inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
            <DialogTitle className="text-sm sm:text-base pr-8 truncate">{currentFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 rounded-lg border border-white/10 m-2 sm:m-4">
            {currentFileType === "step" && currentFileUrl && <STEPViewer url={currentFileUrl} />}
            {currentFileType === "pdf" && currentFileUrl && <PDFViewer url={currentFileUrl} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
