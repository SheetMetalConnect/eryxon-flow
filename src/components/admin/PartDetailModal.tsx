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
import { Plus, Save, X, Upload, Eye, Trash2, Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { STEPViewer } from "@/components/STEPViewer";
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
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    task_name: "",
    stage_id: "",
    estimated_time: 0,
    sequence: 1,
    notes: "",
  });

  // CAD file management state
  const [uploadingCAD, setUploadingCAD] = useState(false);
  const [cadFiles, setCadFiles] = useState<FileList | null>(null);
  const [stepViewerOpen, setStepViewerOpen] = useState(false);
  const [currentStepUrl, setCurrentStepUrl] = useState<string | null>(null);
  const [currentStepTitle, setCurrentStepTitle] = useState<string>("");

  const { data: part, isLoading } = useQuery({
    queryKey: ["part-detail", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select(`
          *,
          job:jobs(job_number, customer),
          stage:stages(name, color),
          tasks (
            *,
            stage:stages(name, color),
            assigned_operator:profiles(full_name)
          )
        `)
        .eq("id", partId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("active", true)
        .order("sequence");

      if (error) throw error;
      return data;
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        part_id: partId,
        task_name: newTask.task_name,
        stage_id: newTask.stage_id,
        estimated_time: newTask.estimated_time || null,
        sequence: newTask.sequence,
        notes: newTask.notes || null,
        status: "not_started",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Task added",
        description: "New task has been added to the part.",
      });
      setAddingTask(false);
      setNewTask({
        task_name: "",
        stage_id: "",
        estimated_time: 0,
        sequence: 1,
        notes: "",
      });
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

  const handleAddTask = () => {
    if (!newTask.task_name || !newTask.stage_id) {
      toast({
        title: "Validation error",
        description: "Task name and stage are required",
        variant: "destructive",
      });
      return;
    }
    addTaskMutation.mutate();
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
        if (!["step", "stp"].includes(fileExt || "")) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a STEP file`,
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

  // Handle viewing STEP file
  const handleViewCADFile = async (filePath: string) => {
    try {
      // Create signed URL
      const { data, error } = await supabase.storage
        .from("parts-cad")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

      // Fetch as blob to avoid CORS issues
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const fileName = filePath.split("/").pop() || "3D Model";
      setCurrentStepUrl(blobUrl);
      setCurrentStepTitle(fileName);
      setStepViewerOpen(true);
    } catch (error: any) {
      console.error("Error opening CAD file:", error);
      toast({
        title: "Error",
        description: "Failed to open 3D viewer",
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

  // Handle step viewer dialog close
  const handleStepDialogClose = (open: boolean) => {
    if (!open && currentStepUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(currentStepUrl); // Prevent memory leak
      setCurrentStepUrl(null);
    }
    setStepViewerOpen(open);
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
              <Label>Current Stage</Label>
              <div className="mt-1">
                {part?.stage ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: part.stage.color,
                      backgroundColor: `${part.stage.color}20`,
                    }}
                  >
                    {part.stage.name}
                  </Badge>
                ) : (
                  <span className="text-gray-400 text-sm">Not started</span>
                )}
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

          {/* CAD Files Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                3D CAD Files ({part?.file_paths?.length || 0})
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
                      : "Choose STEP files (.step, .stp)"}
                  </span>
                </label>
                <input
                  id="cad-upload"
                  type="file"
                  accept=".step,.stp"
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

            {/* Existing CAD Files List */}
            <div className="space-y-2">
              {part?.file_paths?.filter((path: string) => {
                const ext = path.split(".").pop()?.toLowerCase();
                return ext === "step" || ext === "stp";
              }).map((filePath: string, index: number) => {
                const fileName = filePath.split("/").pop() || "Unknown";
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between border rounded-md p-3 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <Box className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{fileName}</p>
                        <p className="text-xs text-gray-500">STEP 3D Model</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCADFile(filePath)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View 3D
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
                  No CAD files uploaded yet
                </p>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg">Tasks ({part?.tasks?.length || 0})</Label>
              <Button size="sm" onClick={() => setAddingTask(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>

            {/* Add Task Form */}
            {addingTask && (
              <div className="border rounded-lg p-4 mb-4 bg-blue-50">
                <h4 className="font-semibold mb-3">New Task</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Task Name *</Label>
                    <Input
                      value={newTask.task_name}
                      onChange={(e) =>
                        setNewTask({ ...newTask, task_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Stage *</Label>
                    <Select
                      value={newTask.stage_id}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, stage_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages?.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Time (minutes)</Label>
                    <Input
                      type="number"
                      value={newTask.estimated_time || ""}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          estimated_time: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sequence</Label>
                    <Input
                      type="number"
                      value={newTask.sequence}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          sequence: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newTask.notes}
                      onChange={(e) =>
                        setNewTask({ ...newTask, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddTask} disabled={addTaskMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {addTaskMutation.isPending ? "Saving..." : "Save Task"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddingTask(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
              {part?.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: task.stage?.color,
                        backgroundColor: `${task.stage?.color}20`,
                      }}
                    >
                      {task.stage?.name}
                    </Badge>
                    <div>
                      <p className="font-medium">{task.task_name}</p>
                      <p className="text-xs text-gray-500">
                        Seq: {task.sequence}
                        {task.estimated_time && ` | Est: ${task.estimated_time}min`}
                        {task.assigned_operator && (
                          <span className="ml-2">
                            | Assigned: {task.assigned_operator.full_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                    {task.status?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {part?.tasks?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* STEP Viewer Dialog */}
      <Dialog open={stepViewerOpen} onOpenChange={handleStepDialogClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{currentStepTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {currentStepUrl && (
              <STEPViewer url={currentStepUrl} title={currentStepTitle} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
