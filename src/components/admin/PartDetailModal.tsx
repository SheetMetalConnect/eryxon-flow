import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, Save, X, Upload, Eye, Trash2, Box, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { STEPViewer } from "@/components/STEPViewer";
import { PDFViewer } from "@/components/PDFViewer";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PartDetailModalProps {
  partId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PartDetailModal({ partId, onClose, onUpdate }: PartDetailModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [addingOperation, setAddingOperation] = useState(false);
  const [newOperation, setNewOperation] = useState({
    operation_name: "",
    cell_id: "",
    estimated_time: 0,
    sequence: 1,
    notes: "",
  });

  // CAD file management state
  const [uploadingCAD, setUploadingCAD] = useState(false);
  const [cadFiles, setCadFiles] = useState<FileList | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<'step' | 'pdf' | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");

  const { data: part, isLoading } = useQuery({
    queryKey: ["part-detail", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select(`
          *,
          job:jobs(job_number, customer)
        `)
        .eq("id", partId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: cells } = useQuery({
    queryKey: ["cells"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("*")
        .eq("active", true)
        .order("sequence");

      if (error) throw error;
      return data;
    },
  });

  const { data: operations, refetch: refetchOperations } = useQuery({
    queryKey: ["operations", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select(`
          *,
          cell:cells(name, color),
          assigned_operator:profiles(full_name)
        `)
        .eq("part_id", partId)
        .order("sequence");
      if (error) throw error;
      return data;
    },
  });

  const addOperationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("operations").insert({
        part_id: partId,
        operation_name: newOperation.operation_name,
        cell_id: newOperation.cell_id,
        estimated_time: newOperation.estimated_time || null,
        sequence: newOperation.sequence,
        notes: newOperation.notes || null,
        status: "not_started",
        tenant_id: (part as any)?.tenant_id,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: "Operation added",
        description: "New operation has been added to the part.",
      });
      setAddingOperation(false);
      setNewOperation({
        operation_name: "",
        cell_id: "",
        estimated_time: 0,
        sequence: 1,
        notes: "",
      });
      await refetchOperations();
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddOperation = () => {
    if (!newOperation.operation_name || !newOperation.cell_id) {
      toast({
        title: "Validation error",
        description: "Operation name and cell are required",
        variant: "destructive",
      });
      return;
    }
    addOperationMutation.mutate();
  };

  // Handle CAD file upload
  const handleCADUpload = async () => {
    if (!cadFiles || cadFiles.length === 0 || !profile?.tenant_id) return;

    setUploadingCAD(true);
    try {
      const uploadedPaths: string[] = [];

      for (let i = 0; i < cadFiles.length; i++) {
        const file = cadFiles[i];
        const fileExt = file.name.split(".").pop()?.toLowerCase();

        // Validate file type
        if (!["step", "stp", "pdf"].includes(fileExt || "")) {
          toast({
            title: "Invalid file type",
            description: `${file.name} must be a STEP or PDF file`,
            variant: "destructive",
          });
          continue;
        }

        const path = `${profile.tenant_id}/parts/${partId}/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("parts-cad")
          .upload(path, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        uploadedPaths.push(path);
      }

      if (uploadedPaths.length > 0) {
        // Update part's file_paths
        const currentPaths = part?.file_paths || [];
        const newPaths = [...currentPaths, ...uploadedPaths];

        const { error: updateError } = await supabase
          .from("parts")
          .update({ file_paths: newPaths })
          .eq("id", partId);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: `${uploadedPaths.length} file(s) uploaded successfully`,
        });

        setCadFiles(null);
        onUpdate();
      }
    } catch (error: any) {
      console.error("CAD upload error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingCAD(false);
    }
  };

  // Handle viewing file (STEP or PDF)
  const handleViewCADFile = async (filePath: string) => {
    try {
      const fileExt = filePath.split(".").pop()?.toLowerCase();
      const fileType = fileExt === "pdf" ? "pdf" : (fileExt === "step" || fileExt === "stp") ? "step" : null;

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

  // Handle deleting CAD file
  const handleDeleteCADFile = async (filePath: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("parts-cad")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update part's file_paths
      const currentPaths = part?.file_paths || [];
      const newPaths = currentPaths.filter((p: string) => p !== filePath);

      const { error: updateError } = await supabase
        .from("parts")
        .update({ file_paths: newPaths })
        .eq("id", partId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      onUpdate();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle file viewer dialog close
  const handleFileDialogClose = (open: boolean) => {
    if (!open && currentFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(currentFileUrl); // Prevent memory leak
      setCurrentFileUrl(null);
    }
    setFileViewerOpen(open);
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Loading part details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Part Details: {part?.part_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Part Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Number</Label>
              <p className="mt-1 font-medium">{part?.job?.job_number}</p>
            </div>

            <div>
              <Label>Customer</Label>
              <p className="mt-1 font-medium">{part?.job?.customer}</p>
            </div>

            <div>
              <Label>Material</Label>
              <p className="mt-1 font-medium">{part?.material}</p>
            </div>

            <div>
              <Label>Quantity</Label>
              <p className="mt-1 font-medium">{part?.quantity}</p>
            </div>

            <div>
              <Label>Status</Label>
              <div className="mt-1">
                <Badge>{part?.status?.replace("_", " ").toUpperCase()}</Badge>
              </div>
            </div>

            <div>
              <Label>Current Cell</Label>
              <div className="mt-1">
                {(() => {
                  const cell = (cells || []).find((c: any) => c.id === (part as any)?.current_cell_id);
                  return cell ? (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: cell.color || undefined,
                        backgroundColor: `${cell.color || "#999"}20`,
                      }}
                    >
                      {cell.name}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">Not started</span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Notes */}
          {part?.notes && (
            <div>
              <Label>Notes</Label>
              <p className="mt-1 text-sm text-gray-600">{part.notes}</p>
            </div>
          )}

          {/* Metadata */}
          {part?.metadata && Object.keys(part.metadata).length > 0 && (
            <div>
              <Label>Custom Metadata</Label>
              <div className="mt-2 border rounded-md p-3">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(part.metadata).map(([key, value]) => (
                      <tr key={key}>
                        <td className="font-medium py-1 pr-4">{key}:</td>
                        <td className="py-1">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Files Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                Files ({part?.file_paths?.length || 0})
              </Label>
            </div>

            {/* File Upload */}
            <div className="border rounded-lg p-4 mb-3 bg-gray-50">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="cad-upload"
                  className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-white transition flex-1"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {cadFiles && cadFiles.length > 0
                      ? `${cadFiles.length} file(s) selected`
                      : "Choose STEP or PDF files"}
                  </span>
                </label>
                <input
                  id="cad-upload"
                  type="file"
                  accept=".step,.stp,.pdf"
                  multiple
                  onChange={(e) => setCadFiles(e.target.files)}
                  className="hidden"
                />
                <Button
                  onClick={handleCADUpload}
                  disabled={!cadFiles || cadFiles.length === 0 || uploadingCAD}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingCAD ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>

            {/* Existing Files List */}
            <div className="space-y-2">
              {part?.file_paths?.map((filePath: string, index: number) => {
                const fileName = filePath.split("/").pop() || "Unknown";
                const fileExt = filePath.split(".").pop()?.toLowerCase();
                const isSTEP = fileExt === "step" || fileExt === "stp";
                const isPDF = fileExt === "pdf";

                if (!isSTEP && !isPDF) return null;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between border rounded-md p-3 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      {isSTEP ? (
                        <Box className="h-5 w-5 text-blue-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{fileName}</p>
                        <p className="text-xs text-gray-500">
                          {isSTEP ? "3D Model" : "Drawing"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCADFile(filePath)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCADFile(filePath)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(!part?.file_paths || part.file_paths.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No files uploaded yet
                </p>
              )}
            </div>
          </div>

          {/* Operations */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg">Operations ({operations?.length || 0})</Label>
              <Button size="sm" onClick={() => setAddingOperation(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Operation
              </Button>
            </div>

            {/* Add Operation Form */}
            {addingOperation && (
              <div className="border rounded-lg p-4 mb-4 bg-blue-50">
                <h4 className="font-semibold mb-3">New Operation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Operation Name *</Label>
                    <Input
                      value={newOperation.operation_name}
                      onChange={(e) =>
                        setNewOperation({ ...newOperation, operation_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Cell *</Label>
                    <Select
                      value={newOperation.cell_id}
                      onValueChange={(value) =>
                        setNewOperation({ ...newOperation, cell_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cell" />
                      </SelectTrigger>
                      <SelectContent>
                        {cells?.map((cell: any) => (
                          <SelectItem key={cell.id} value={cell.id}>
                            {cell.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Time (minutes)</Label>
                    <Input
                      type="number"
                      value={newOperation.estimated_time || ""}
                      onChange={(e) =>
                        setNewOperation({
                          ...newOperation,
                          estimated_time: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sequence</Label>
                    <Input
                      type="number"
                      value={newOperation.sequence}
                      onChange={(e) =>
                        setNewOperation({
                          ...newOperation,
                          sequence: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newOperation.notes}
                      onChange={(e) =>
                        setNewOperation({ ...newOperation, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddOperation} disabled={addOperationMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {addOperationMutation.isPending ? "Saving..." : "Save Operation"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddingOperation(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Operations List */}
            <div className="space-y-2">
              {operations?.map((op: any) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: op.cell?.color,
                        backgroundColor: `${op.cell?.color || "#999"}20`,
                      }}
                    >
                      {op.cell?.name}
                    </Badge>
                    <div>
                      <p className="font-medium">{op.operation_name}</p>
                      <p className="text-xs text-gray-500">
                        Seq: {op.sequence}
                        {op.estimated_time && ` | Est: ${op.estimated_time}min`}
                        {op.assigned_operator && (
                          <span className="ml-2">
                            | Assigned: {op.assigned_operator.full_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={op.status === "completed" ? "default" : "secondary"}>
                    {op.status?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {(operations?.length || 0) === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No operations added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* File Viewer Dialog */}
      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{currentFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {currentFileUrl && currentFileType === "step" && (
              <STEPViewer url={currentFileUrl} title={currentFileTitle} />
            )}
            {currentFileUrl && currentFileType === "pdf" && (
              <PDFViewer url={currentFileUrl} title={currentFileTitle} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
