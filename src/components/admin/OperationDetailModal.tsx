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
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { STEPViewer } from "@/components/STEPViewer";
import { PDFViewer } from "@/components/PDFViewer";
import { useAuth } from "@/contexts/AuthContext";
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
  const { toast } = useToast();
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

  // Fetch resources for this operation
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
            type
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
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("operations")
        .update({ status: newStatus })
        .eq("id", operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-detail", operationId] });
      onUpdate();
      toast({
        title: "Status Updated",
        description: "Operation status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
      toast({
        title: "Operator Assigned",
        description: "Operation has been assigned.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
        toast({
          title: "Error",
          description: "Unsupported file type",
          variant: "destructive",
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
    const labels: Record<string, string> = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
      on_hold: "On Hold",
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

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="glass-card max-w-2xl">
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
        <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {operation?.operation_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status & Cell Row */}
            <div className="flex flex-wrap items-center gap-3">
              {getStatusBadge(operation?.status)}
              {operation?.cells && (
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: operation.cells.color
                      ? `${operation.cells.color}20`
                      : undefined,
                    borderColor: operation.cells.color || undefined,
                  }}
                >
                  {operation.cells.name}
                </Badge>
              )}
            </div>

            {/* Part & Job Info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <Label className="text-xs text-muted-foreground">Part</Label>
                <div className="font-medium">#{operation?.parts?.part_number}</div>
                <div className="text-xs text-muted-foreground">
                  {operation?.parts?.material} · Qty: {operation?.parts?.quantity}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Job</Label>
                <div className="font-medium">JOB-{operation?.parts?.jobs?.job_number}</div>
                <div className="text-xs text-muted-foreground">
                  {operation?.parts?.jobs?.customer}
                </div>
              </div>
            </div>

            {/* Due Date */}
            {operation?.parts?.jobs?.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Due: {format(new Date(operation.parts.jobs.due_date), "MMM dd, yyyy")}</span>
              </div>
            )}

            {/* Estimated Time */}
            {operation?.estimated_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Est. Time: {operation.estimated_time} min</span>
              </div>
            )}

            {/* Resources */}
            {resources && resources.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Required Resources</Label>
                <div className="flex flex-wrap gap-2">
                  {resources.map((r: any) => (
                    <Badge key={r.id} variant="outline" className="gap-1">
                      <Wrench className="h-3 w-3" />
                      {r.resource?.name}
                      {r.quantity > 1 && ` × ${r.quantity}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {(stepFiles.length > 0 || pdfFiles.length > 0) && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Part Files</Label>
                <div className="flex flex-wrap gap-2">
                  {stepFiles.map((file: string, idx: number) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      className="gap-1"
                    >
                      <Box className="h-4 w-4 text-primary" />
                      {file.split("/").pop()}
                    </Button>
                  ))}
                  {pdfFiles.map((file: string, idx: number) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      className="gap-1"
                    >
                      <FileText className="h-4 w-4 text-destructive" />
                      {file.split("/").pop()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Assigned Operator</Label>
              <Select
                value={operation?.assigned_operator_id || "unassigned"}
                onValueChange={(value) =>
                  assignOperatorMutation.mutate(value === "unassigned" ? null : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned</span>
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
                <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                <p className="text-sm bg-muted/30 p-2 rounded border border-border/50">
                  {operation.notes}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              {operation?.status !== "completed" && (
                <>
                  {operation?.status === "not_started" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate("in_progress")}
                      className="gap-1"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  )}
                  {operation?.status === "in_progress" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate("on_hold")}
                        className="gap-1"
                      >
                        <Pause className="h-4 w-4" />
                        Hold
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate("completed")}
                        className="gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Complete
                      </Button>
                    </>
                  )}
                  {operation?.status === "on_hold" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate("in_progress")}
                      className="gap-1"
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="glass-card max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{currentFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-white/10">
            {currentFileType === "step" && currentFileUrl && <STEPViewer url={currentFileUrl} />}
            {currentFileType === "pdf" && currentFileUrl && <PDFViewer url={currentFileUrl} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
