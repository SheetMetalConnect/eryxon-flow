import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Plus, Save, X, Upload, Eye, Trash2, Box, FileText, AlertTriangle, Package, ChevronRight, Wrench, Image as ImageIcon, Zap, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { STEPViewer } from "@/components/STEPViewer";
import { PDFViewer } from "@/components/PDFViewer";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { UploadProgress } from "@/components/UploadProgress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchChildParts, fetchParentPart, checkAssemblyDependencies } from "@/lib/database";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { IssuesSummarySection } from "@/components/issues/IssuesSummarySection";
import { RoutingVisualization } from "@/components/qrm/RoutingVisualization";
import { usePartRouting } from "@/hooks/useQRMMetrics";
import { ImageUpload } from "@/components/parts/ImageUpload";
import { ImageGallery } from "@/components/parts/ImageGallery";

interface PartDetailModalProps {
  partId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PartDetailModal({ partId, onClose, onUpdate }: PartDetailModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { routing, loading: routingLoading } = usePartRouting(partId);
  const [addingOperation, setAddingOperation] = useState(false);
  const [newOperation, setNewOperation] = useState({
    operation_name: "",
    cell_id: "",
    estimated_time: 0,
    sequence: 1,
    notes: "",
    selected_resources: [] as { resource_id: string; quantity: number; notes: string }[],
  });

  // CAD file management state
  const [cadFiles, setCadFiles] = useState<FileList | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<'step' | 'pdf' | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");

  // New part fields state
  const [drawingNo, setDrawingNo] = useState<string>("");
  const [cncProgramName, setCncProgramName] = useState<string>("");
  const [isBulletCard, setIsBulletCard] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Upload hook with progress tracking and quota validation
  const {
    progress: uploadProgress,
    isUploading,
    uploadFiles,
    resetProgress,
  } = useFileUpload();

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

  // Initialize new fields from part data
  useEffect(() => {
    if (part) {
      setDrawingNo(part.drawing_no || "");
      setCncProgramName(part.cnc_program_name || "");
      setIsBulletCard(part.is_bullet_card || false);
      setHasChanges(false);
    }
  }, [part]);

  // Mutation to update part fields
  const updatePartFieldsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("parts")
        .update({
          drawing_no: drawingNo || null,
          cnc_program_name: cncProgramName || null,
          is_bullet_card: isBulletCard,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partId);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: t("common.success"),
        description: t("parts.fieldsUpdated"),
      });
      setHasChanges(false);
      await queryClient.invalidateQueries({ queryKey: ["part-detail", partId] });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Track changes
  const handleFieldChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  // Fetch available resources for linking
  const { data: availableResources } = useQuery({
    queryKey: ["available-resources", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
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

      // Fetch resource counts for each operation
      if (data && data.length > 0) {
        const operationIds = data.map(op => op.id);
        const { data: resourceCounts } = await supabase
          .from("operation_resources")
          .select("operation_id")
          .in("operation_id", operationIds);

        // Count resources per operation
        const countMap = new Map<string, number>();
        resourceCounts?.forEach(item => {
          countMap.set(item.operation_id, (countMap.get(item.operation_id) || 0) + 1);
        });

        // Add resource count to each operation
        return data.map(op => ({
          ...op,
          resources_count: countMap.get(op.id) || 0,
        }));
      }

      return data;
    },
  });

  // Fetch parent part
  const { data: parentPart } = useQuery({
    queryKey: ["parent-part", partId],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      return await fetchParentPart(partId, profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch child parts
  const { data: childParts, refetch: refetchChildParts } = useQuery({
    queryKey: ["child-parts", partId],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      return await fetchChildParts(partId, profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  // Check assembly dependencies
  const { data: dependencies } = useQuery({
    queryKey: ["assembly-dependencies", partId],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      return await checkAssemblyDependencies(partId, profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const addOperationMutation = useMutation({
    mutationFn: async () => {
      // Insert the operation first
      const { data: opData, error: opError } = await supabase
        .from("operations")
        .insert({
          part_id: partId,
          operation_name: newOperation.operation_name,
          cell_id: newOperation.cell_id,
          estimated_time: newOperation.estimated_time || null,
          sequence: newOperation.sequence,
          notes: newOperation.notes || null,
          status: "not_started",
          tenant_id: (part as any)?.tenant_id,
        })
        .select()
        .single();

      if (opError) throw opError;

      // Link resources if any were selected
      if (newOperation.selected_resources.length > 0 && opData) {
        const resourceLinks = newOperation.selected_resources.map((res) => ({
          operation_id: opData.id,
          resource_id: res.resource_id,
          quantity: res.quantity,
          notes: res.notes || null,
        }));

        const { error: linkError } = await supabase
          .from("operation_resources")
          .insert(resourceLinks);

        if (linkError) throw linkError;
      }
    },
    onSuccess: async () => {
      toast({
        title: t("operations.operationAdded"),
        description: t("operations.operationAddedDesc"),
      });
      setAddingOperation(false);
      setNewOperation({
        operation_name: "",
        cell_id: "",
        estimated_time: 0,
        sequence: 1,
        notes: "",
        selected_resources: [],
      });
      await refetchOperations();
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddOperation = () => {
    if (!newOperation.operation_name || !newOperation.cell_id) {
      toast({
        title: t("common.validationError"),
        description: t("operations.nameAndCellRequired"),
        variant: "destructive",
      });
      return;
    }
    addOperationMutation.mutate();
  };

  // Handle CAD file upload with progress tracking
  const handleCADUpload = async () => {
    if (!cadFiles || cadFiles.length === 0 || !profile?.tenant_id) return;

    // Reset progress from previous uploads
    resetProgress();

    try {
      const result = await uploadFiles(
        cadFiles,
        "parts-cad",
        (file, index) => `${profile.tenant_id}/parts/${partId}/${file.name}`,
        {
          allowedExtensions: ["step", "stp", "pdf"],
          maxFileSizeMB: 100, // 100MB max per file
          validateQuota: true, // Check storage quota before upload
        }
      );

      // Update part's file_paths with successfully uploaded files
      if (result.uploadedPaths.length > 0) {
        const currentPaths = part?.file_paths || [];
        const newPaths = [...currentPaths, ...result.uploadedPaths];

        const { error: updateError } = await supabase
          .from("parts")
          .update({ file_paths: newPaths })
          .eq("id", partId);

        if (updateError) throw updateError;

        toast({
          title: t("common.success"),
          description: t("parts.filesUploadedSuccess", { count: result.uploadedPaths.length }),
        });

        setCadFiles(null);
        
        // Refresh modal data and parent list
        await queryClient.invalidateQueries({ queryKey: ["part-detail", partId] });
        onUpdate();
      }

      // Show errors for failed files
      if (result.failedFiles.length > 0) {
        result.failedFiles.forEach(({ fileName, error }) => {
          toast({
            title: t("parts.uploadFailed"),
            description: `${fileName}: ${error}`,
            variant: "destructive",
          });
        });
      }
    } catch (error: any) {
      console.error("CAD upload error:", error);
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle viewing file (STEP or PDF)
  const handleViewCADFile = async (filePath: string) => {
    try {
      const fileExt = filePath.split(".").pop()?.toLowerCase();
      const fileType = fileExt === "pdf" ? "pdf" : (fileExt === "step" || fileExt === "stp") ? "step" : null;

      if (!fileType) {
        toast({
          title: t("common.error"),
          description: t("parts.unsupportedFileType"),
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
        title: t("common.error"),
        description: t("parts.failedToOpenFileViewer"),
        variant: "destructive",
      });
    }
  };

  // Handle deleting CAD file
  const handleDeleteCADFile = async (filePath: string) => {
    if (!confirm(t("parts.confirmDeleteFile"))) return;

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
        title: t("common.success"),
        description: t("parts.fileDeletedSuccess"),
      });

      // Refresh modal data and parent list
      await queryClient.invalidateQueries({ queryKey: ["part-detail", partId] });
      onUpdate();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: t("common.error"),
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
          <div className="text-center py-8">{t("parts.loadingPartDetails")}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("parts.partDetails")}: {part?.part_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Part Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("jobs.jobNumber")}</Label>
              <p className="mt-1 font-medium">{part?.job?.job_number}</p>
            </div>

            <div>
              <Label>{t("jobs.customer")}</Label>
              <p className="mt-1 font-medium">{part?.job?.customer}</p>
            </div>

            <div>
              <Label>{t("parts.material")}</Label>
              <p className="mt-1 font-medium">{part?.material}</p>
            </div>

            <div>
              <Label>{t("parts.quantity")}</Label>
              <p className="mt-1 font-medium">{part?.quantity}</p>
            </div>

            <div>
              <Label>{t("parts.status.title")}</Label>
              <div className="mt-1">
                <Badge>
                  {part?.status === "not_started" && t("parts.status.notStarted")}
                  {part?.status === "in_progress" && t("parts.status.inProgress")}
                  {part?.status === "completed" && t("parts.status.completed")}
                  {!["not_started", "in_progress", "completed"].includes(part?.status || "") &&
                    part?.status?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <Label>{t("parts.currentCell")}</Label>
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
                    <span className="text-muted-foreground text-sm">{t("parts.notStarted")}</span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Manufacturing Fields - Drawing No, CNC Program, Bullet Card */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {t("parts.manufacturingInfo")}
              </Label>
              {hasChanges && (
                <Button
                  size="sm"
                  onClick={() => updatePartFieldsMutation.mutate()}
                  disabled={updatePartFieldsMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatePartFieldsMutation.isPending ? t("common.saving") : t("common.saveChanges")}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Drawing Number */}
              <div>
                <Label htmlFor="drawing-no">{t("parts.drawingNo")}</Label>
                <Input
                  id="drawing-no"
                  value={drawingNo}
                  onChange={(e) => handleFieldChange(setDrawingNo, e.target.value)}
                  placeholder={t("parts.drawingNoPlaceholder")}
                  className="mt-1"
                />
              </div>

              {/* CNC Program Name */}
              <div>
                <Label htmlFor="cnc-program">{t("parts.cncProgramName")}</Label>
                <Input
                  id="cnc-program"
                  value={cncProgramName}
                  onChange={(e) => handleFieldChange(setCncProgramName, e.target.value)}
                  placeholder={t("parts.cncProgramPlaceholder")}
                  className="mt-1"
                />
              </div>

              {/* Bullet Card Toggle */}
              <div className="col-span-2">
                <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                  <div className="flex items-center gap-3">
                    <Zap className={`h-5 w-5 ${isBulletCard ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <div>
                      <Label htmlFor="bullet-card" className="cursor-pointer">
                        {t("parts.bulletCard")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("parts.bulletCardDesc")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="bullet-card"
                    checked={isBulletCard}
                    onCheckedChange={(checked) => handleFieldChange(setIsBulletCard, checked)}
                  />
                </div>
              </div>

              {/* QR Code Preview */}
              {cncProgramName && (
                <div className="col-span-2">
                  <Label>{t("parts.qrCodePreview")}</Label>
                  <div className="mt-2 flex items-center gap-4 p-3 border rounded-md bg-white">
                    <QRCodeSVG
                      value={cncProgramName}
                      size={80}
                      level="M"
                      includeMargin={false}
                    />
                    <div>
                      <p className="font-mono font-bold text-foreground">{cncProgramName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("parts.qrCodeDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Routing Visualization */}
          <div>
            <Label className="text-lg">{t("qrm.routing")}</Label>
            <div className="mt-3 border rounded-lg p-4 bg-muted">
              <RoutingVisualization routing={routing} loading={routingLoading} compact />
            </div>
          </div>

          {/* Notes */}
          {part?.notes && (
            <div>
              <Label>{t("parts.notes")}</Label>
              <p className="mt-1 text-sm text-muted-foreground">{part.notes}</p>
            </div>
          )}

          {/* Metadata */}
          {part?.metadata && Object.keys(part.metadata).length > 0 && (
            <div>
              <Label>{t("parts.customMetadata")}</Label>
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

          {/* Assembly Tracking Section */}
          {(parentPart || (childParts && childParts.length > 0)) && (
            <div className="border-t pt-6">
              <Label className="text-lg flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                {t("parts.assemblyRelationships")}
              </Label>

              {/* Parent Part */}
              {parentPart && (
                <div className="mb-4">
                  <Label className="text-sm text-muted-foreground">{t("parts.parentAssembly")}</Label>
                  <div className="mt-2 border rounded-lg p-3 bg-alert-info-bg border-alert-info-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
                        <div>
                          <p className="font-medium">{parentPart.part_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {parentPart.material} | {t("jobs.job")}: {parentPart.job?.job_number}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{parentPart.status?.replace("_", " ")}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Child Parts */}
              {childParts && childParts.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {t("parts.childComponents")} ({childParts.length})
                  </Label>

                  {/* Dependency Warning */}
                  {dependencies && !dependencies.dependenciesMet && (
                    <Alert variant="destructive" className="my-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{t("parts.dependencyWarning")}</AlertTitle>
                      <AlertDescription>
                        {t("parts.dependencyWarningDesc", { count: dependencies.warnings.length })}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-2 space-y-2">
                    {childParts.map((child: any) => {
                      const completedOps = child.operations?.filter((op: any) => op.status === "completed").length || 0;
                      const totalOps = child.operations?.length || 0;
                      const isComplete = child.status === "completed";

                      return (
                        <div
                          key={child.id}
                          className={`border rounded-lg p-3 ${isComplete ? "bg-alert-success-bg" : "bg-card"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{child.part_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {child.material} | {totalOps} {t("operations.operation", { count: totalOps })}
                                  {totalOps > 0 && ` (${completedOps}/${totalOps} ${t("parts.done")})`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isComplete ? "default" : "secondary"}
                                className={isComplete ? "bg-success text-success-foreground" : ""}
                              >
                                {child.status?.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dependencies && dependencies.dependenciesMet && (
                    <div className="mt-3 p-3 bg-alert-success-bg border border-alert-success-border rounded-lg">
                      <p className="text-sm text-success flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t("parts.readyForAssembly")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Files Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                {t("parts.files")} ({part?.file_paths?.length || 0})
              </Label>
            </div>

            {/* File Upload */}
            <div className="border rounded-lg p-4 mb-3 bg-muted">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="cad-upload"
                  className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-card transition flex-1"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {cadFiles && cadFiles.length > 0
                      ? t("parts.filesSelected", { count: cadFiles.length })
                      : t("parts.chooseStepOrPdf")}
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
                  disabled={!cadFiles || cadFiles.length === 0 || isUploading}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? t("parts.uploading") : t("parts.upload")}
                </Button>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <UploadProgress progress={uploadProgress} className="mb-4" />
            )}

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
                    className="flex items-center justify-between border rounded-md p-3 bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {isSTEP ? (
                        <Box className="h-5 w-5 text-brand-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {isSTEP ? t("parts.3dModel") : t("parts.drawing")}
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
                        {t("parts.view")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCADFile(filePath)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(!part?.file_paths || part.file_paths.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("parts.noFilesYet")}
                </p>
              )}
            </div>
          </div>

          {/* Images Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                {t("parts.images.title")} ({part?.image_paths?.length || 0})
              </Label>
            </div>

            {/* Image Gallery */}
            {part?.image_paths && part.image_paths.length > 0 && (
              <div className="mb-4">
                <ImageGallery
                  partId={partId}
                  imagePaths={part.image_paths}
                  onImageDeleted={async () => {
                    // Refresh modal data and parent list
                    await queryClient.invalidateQueries({ queryKey: ["part-detail", partId] });
                    onUpdate();
                  }}
                  editable={true}
                />
              </div>
            )}

            {/* Image Upload */}
            <ImageUpload
              partId={partId}
              onUploadComplete={async () => {
                // Refresh modal data and parent list
                await queryClient.invalidateQueries({ queryKey: ["part-detail", partId] });
                onUpdate();
              }}
            />
          </div>

          {/* NCRs / Issues Summary */}
          <IssuesSummarySection partId={partId} />

          {/* Operations */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-lg">{t("operations.title")} ({operations?.length || 0})</Label>
              <Button size="sm" onClick={() => setAddingOperation(true)}>
                <Plus className="h-4 w-4 mr-2" /> {t("operations.addOperation")}
              </Button>
            </div>

            {/* Add Operation Form */}
            {addingOperation && (
              <div className="border rounded-lg p-4 mb-4 bg-alert-info-bg border-alert-info-border">
                <h4 className="font-semibold mb-3">{t("operations.newOperation")}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("operations.operationName")} *</Label>
                    <Input
                      value={newOperation.operation_name}
                      onChange={(e) =>
                        setNewOperation({ ...newOperation, operation_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("operations.cell")} *</Label>
                    <Select
                      value={newOperation.cell_id}
                      onValueChange={(value) =>
                        setNewOperation({ ...newOperation, cell_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("operations.selectCell")} />
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
                    <Label>{t("operations.estimatedTimeMinutes")}</Label>
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
                    <Label>{t("operations.sequence")}</Label>
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
                    <Label>{t("operations.notes")}</Label>
                    <Textarea
                      value={newOperation.notes}
                      onChange={(e) =>
                        setNewOperation({ ...newOperation, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  {/* Resource Linking Section */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      <Label>{t("operations.requiredResourcesOptional")}</Label>
                    </div>

                    {/* Resource Selection Dropdown */}
                    <Select
                      onValueChange={(resourceId) => {
                        // Add resource to selected list if not already added
                        if (!newOperation.selected_resources.find(r => r.resource_id === resourceId)) {
                          setNewOperation({
                            ...newOperation,
                            selected_resources: [
                              ...newOperation.selected_resources,
                              { resource_id: resourceId, quantity: 1, notes: "" }
                            ]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("operations.addResource")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableResources
                          ?.filter(res => !newOperation.selected_resources.find(sr => sr.resource_id === res.id))
                          .map((resource: any) => (
                            <SelectItem key={resource.id} value={resource.id}>
                              <div className="flex items-center gap-2">
                                <span>{resource.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {resource.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {/* Selected Resources List */}
                    {newOperation.selected_resources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {newOperation.selected_resources.map((selectedRes, idx) => {
                          const resource = availableResources?.find(r => r.id === selectedRes.resource_id);
                          return (
                            <div key={idx} className="border rounded-md p-3 bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wrench className="h-3 w-3 text-orange-600" />
                                    <span className="font-medium text-sm">{resource?.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {resource?.type}
                                    </Badge>
                                  </div>
                                  {resource?.description && (
                                    <p className="text-xs text-muted-foreground">{resource.description}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setNewOperation({
                                      ...newOperation,
                                      selected_resources: newOperation.selected_resources.filter((_, i) => i !== idx)
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">{t("operations.quantity")}</Label>
                                  <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={selectedRes.quantity}
                                    onChange={(e) => {
                                      const updated = [...newOperation.selected_resources];
                                      updated[idx].quantity = parseFloat(e.target.value) || 1;
                                      setNewOperation({ ...newOperation, selected_resources: updated });
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{t("operations.instructionsOptional")}</Label>
                                  <Input
                                    value={selectedRes.notes}
                                    onChange={(e) => {
                                      const updated = [...newOperation.selected_resources];
                                      updated[idx].notes = e.target.value;
                                      setNewOperation({ ...newOperation, selected_resources: updated });
                                    }}
                                    placeholder={t("operations.specialInstructions")}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddOperation} disabled={addOperationMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {addOperationMutation.isPending ? t("operations.saving") : t("operations.saveOperation")}
                  </Button>
                  <Button variant="outline" onClick={() => setAddingOperation(false)}>
                    <X className="h-4 w-4 mr-2" /> {t("common.cancel")}
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{op.operation_name}</p>
                        {op.resources_count > 0 && (
                          <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0">
                            <Wrench className="h-3 w-3 text-orange-600" />
                            {op.resources_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("operations.seq")}: {op.sequence}
                        {op.estimated_time && ` | ${t("operations.est")}: ${op.estimated_time}${t("operations.min")}`}
                        {op.assigned_operator && (
                          <span className="ml-2">
                            | {t("operations.assigned")}: {op.assigned_operator.full_name}
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("operations.noOperationsYet")}
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
