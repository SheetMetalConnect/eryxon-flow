import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryKeys } from "@/lib/queryClient";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Plus, Save, X, Upload, Eye, Trash2, Box, FileText, AlertTriangle, Package, ChevronRight, Wrench, Image as ImageIcon, Zap, QrCode, Truck, Ruler } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { UploadProgress } from "@/components/UploadProgress";
import { usePMI, isPMIServiceEnabled } from "@/hooks/usePMI";
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
import { logger } from '@/lib/logger';

interface PartDetailModalProps {
  partId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PartDetailModal({ partId, onClose, onUpdate }: PartDetailModalProps) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { routing, loading: routingLoading } = usePartRouting(partId, profile?.tenant_id || null);
  const [addingOperation, setAddingOperation] = useState(false);
  const [newOperation, setNewOperation] = useState({
    operation_name: "",
    cell_id: "",
    estimated_time: 0,
    sequence: 1,
    notes: "",
    selected_resources: [] as { resource_id: string; quantity: number; notes: string }[],
  });


  const [cadFiles, setCadFiles] = useState<FileList | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<'step' | 'pdf' | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");


  const [drawingNo, setDrawingNo] = useState<string>("");
  const [cncProgramName, setCncProgramName] = useState<string>("");
  const [isBulletCard, setIsBulletCard] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);


  const [weightKg, setWeightKg] = useState<string>("");
  const [lengthMm, setLengthMm] = useState<string>("");
  const [widthMm, setWidthMm] = useState<string>("");
  const [heightMm, setHeightMm] = useState<string>("");


  const {
    progress: uploadProgress,
    isUploading,
    uploadFiles,
    resetProgress,
  } = useFileUpload();


  const {
    extractPMI,
    isExtracting: isExtractingPMI,
    hasPMI,
    pmiSummary,
    isPMIServiceEnabled: pmiEnabled,
  } = usePMI(partId);

  const { data: part, isLoading } = useQuery({
    queryKey: QueryKeys.parts.detail(partId),
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
    queryKey: QueryKeys.cells.active(profile?.tenant_id || ""),
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


  useEffect(() => {
    if (part) {
      setDrawingNo(part.drawing_no || "");
      setCncProgramName(part.cnc_program_name || "");
      setIsBulletCard(part.is_bullet_card || false);

      setWeightKg(part.weight_kg?.toString() || "");
      setLengthMm(part.length_mm?.toString() || "");
      setWidthMm(part.width_mm?.toString() || "");
      setHeightMm(part.height_mm?.toString() || "");
      setHasChanges(false);
    }
  }, [part]);


  const updatePartFieldsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("parts")
        .update({
          drawing_no: drawingNo || null,
          cnc_program_name: cncProgramName || null,
          is_bullet_card: isBulletCard,
    
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          length_mm: lengthMm ? parseFloat(lengthMm) : null,
          width_mm: widthMm ? parseFloat(widthMm) : null,
          height_mm: heightMm ? parseFloat(heightMm) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partId);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("common.success"), {
        description: t("parts.fieldsUpdated"),
      });
      setHasChanges(false);
      await queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), {
        description: error.message,
      });
    },
  });


  const handleFieldChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setHasChanges(true);
  };


  const { data: availableResources } = useQuery({
    queryKey: QueryKeys.config.availableResources(profile?.tenant_id || ""),
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
    queryKey: QueryKeys.operations.byPart(partId),
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

      if (data && data.length > 0) {
        const operationIds = data.map(op => op.id);
        const { data: resourceCounts } = await supabase
          .from("operation_resources")
          .select("operation_id")
          .in("operation_id", operationIds);

        const countMap = new Map<string, number>();
        resourceCounts?.forEach(item => {
          countMap.set(item.operation_id, (countMap.get(item.operation_id) || 0) + 1);
        });

        return data.map(op => ({
          ...op,
          resources_count: countMap.get(op.id) || 0,
        }));
      }

      return data;
    },
  });

  const { data: parentPart } = useQuery({
    queryKey: QueryKeys.parts.parent(partId),
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      return await fetchParentPart(partId, profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: childParts, refetch: refetchChildParts } = useQuery({
    queryKey: QueryKeys.parts.children(partId),
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      return await fetchChildParts(partId, profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: dependencies } = useQuery({
    queryKey: QueryKeys.parts.assemblyDeps(partId),
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      return await checkAssemblyDependencies(partId, profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const addOperationMutation = useMutation({
    mutationFn: async () => {
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
          tenant_id: part?.tenant_id,
        })
        .select()
        .single();

      if (opError) throw opError;

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
      toast.success(t("operations.operationAdded"), {
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
    onError: (error: Error) => {
      toast.error(t("common.error"), {
        description: error.message,
      });
    },
  });

  const handleAddOperation = () => {
    if (!newOperation.operation_name || !newOperation.cell_id) {
      toast.error(t("common.validationError"), {
        description: t("operations.nameAndCellRequired"),
      });
      return;
    }
    addOperationMutation.mutate();
  };

  const handleCADUpload = async () => {
    if (!cadFiles || cadFiles.length === 0 || !profile?.tenant_id) return;

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

      if (result.uploadedPaths.length > 0) {
        const currentPaths = part?.file_paths || [];
        const newPaths = [...currentPaths, ...result.uploadedPaths];

        const { error: updateError } = await supabase
          .from("parts")
          .update({ file_paths: newPaths })
          .eq("id", partId);

        if (updateError) throw updateError;

        toast.success(t("common.success"), {
          description: t("parts.filesUploadedSuccess", { count: result.uploadedPaths.length }),
        });

        if (pmiEnabled) {
          const stepFiles = result.uploadedPaths.filter(path => {
            const ext = path.toLowerCase().split('.').pop();
            return ext === 'step' || ext === 'stp';
          });

          for (const stepPath of stepFiles) {
            try {
              const { data: signedUrlData } = await supabase.storage
                .from("parts-cad")
                .createSignedUrl(stepPath, 3600);

              if (signedUrlData?.signedUrl) {
                const fileName = stepPath.split('/').pop() || 'model.step';
                const pmiResult = await extractPMI(signedUrlData.signedUrl, fileName);

                if (pmiResult.success && pmiResult.pmi) {
                  toast.success(t("parts.pmiExtracted"), {
                    description: t("parts.pmiExtractedDesc", {
                      count: pmiResult.pmi.dimensions.length
                    }),
                  });
                }
              }
            } catch (pmiError) {
              // Don't show error toast - PMI is optional
              logger.warn('PartDetailModal', 'PMI extraction failed', pmiError);
            }
          }
        }

        setCadFiles(null);

        await queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
        onUpdate();
      }

      if (result.failedFiles.length > 0) {
        result.failedFiles.forEach(({ fileName, error }) => {
          toast.error(t("parts.uploadFailed"), {
            description: `${fileName}: ${error}`,
          });
        });
      }
    } catch (error: unknown) {
      logger.error('PartDetailModal', 'CAD upload error', error);
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleViewCADFile = async (filePath: string) => {
    try {
      const fileExt = filePath.split(".").pop()?.toLowerCase();
      const fileType = fileExt === "pdf" ? "pdf" : (fileExt === "step" || fileExt === "stp") ? "step" : null;

      if (!fileType) {
        toast.error(t("common.error"), {
          description: t("parts.unsupportedFileType"),
        });
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
      logger.error('PartDetailModal', 'Error opening file', error);
      toast.error(t("common.error"), {
        description: t("parts.failedToOpenFileViewer"),
      });
    }
  };

  const handleDeleteCADFile = async (filePath: string) => {
    if (!confirm(t("parts.confirmDeleteFile"))) return;

    try {
      const { error: deleteError } = await supabase.storage
        .from("parts-cad")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      const currentPaths = part?.file_paths || [];
      const newPaths = currentPaths.filter((p: string) => p !== filePath);

      const { error: updateError } = await supabase
        .from("parts")
        .update({ file_paths: newPaths })
        .eq("id", partId);

      if (updateError) throw updateError;

      toast.success(t("common.success"), {
        description: t("parts.fileDeletedSuccess"),
      });

      await queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
      onUpdate();
    } catch (error: unknown) {
      logger.error('PartDetailModal', 'Delete error', error);
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleFileDialogClose = (open: boolean) => {
    if (!open && currentFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(currentFileUrl);
      setCurrentFileUrl(null);
    }
    setFileViewerOpen(open);
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("parts.loadingPartDetails")}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">{t("parts.loadingPartDetails")}</div>
        </DialogContent>
      </Dialog>
    );
  }

  const operationsCount = operations?.length || 0;
  const completedOps = operations?.filter((op: { status: string }) => op.status === "completed").length || 0;
  const filesCount = (part?.file_paths?.length || 0) + (part?.image_paths?.length || 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {t("parts.partDetails")}: #{part?.part_number}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {part?.job?.job_number} · {part?.job?.customer}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`
                ${part?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
                ${part?.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                ${part?.status === 'not_started' ? 'bg-slate-500/10 text-slate-600 border-slate-500/20' : ''}
              `} variant="outline">
                {part?.status === "not_started" && t("parts.status.notStarted")}
                {part?.status === "in_progress" && t("parts.status.inProgress")}
                {part?.status === "completed" && t("parts.status.completed")}
              </Badge>
              {hasChanges && (
                <Button
                  size="sm"
                  onClick={() => updatePartFieldsMutation.mutate()}
                  disabled={updatePartFieldsMutation.isPending}
                  className="h-8"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {updatePartFieldsMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 border-b">
            <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-4 overflow-x-auto">
              <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 shrink-0">
                {t("common.details", "Details")}
              </TabsTrigger>
              <TabsTrigger value="operations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 shrink-0">
                {t("operations.title")} ({operationsCount})
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 shrink-0">
                {t("parts.files", "Files")} ({filesCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="p-4 sm:p-6 space-y-5 m-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.material")}</p>
                  <p className="mt-1 font-semibold text-sm">{part?.material || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.quantity")}</p>
                  <p className="mt-1 font-semibold text-sm">{part?.quantity}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("operations.title")}</p>
                  <p className="mt-1 font-semibold text-sm">{completedOps}/{operationsCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.currentCell")}</p>
                  <div className="mt-1">
                    {(() => {
                      const cell = (cells || []).find((c: { id: string }) => c.id === part?.current_cell_id);
                      return cell ? (
                        <Badge variant="outline" style={{ borderColor: cell.color, backgroundColor: `${cell.color}20` }}>
                          {cell.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t("qrm.routing")}</h3>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <RoutingVisualization routing={routing} loading={routingLoading} />
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  {t("parts.manufacturingInfo")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="drawing-no" className="text-xs text-muted-foreground">{t("parts.drawingNo")}</Label>
                    <Input
                      id="drawing-no"
                      value={drawingNo}
                      onChange={(e) => handleFieldChange(setDrawingNo, e.target.value)}
                      placeholder={t("parts.drawingNoPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnc-program" className="text-xs text-muted-foreground">{t("parts.cncProgramName")}</Label>
                    <Input
                      id="cnc-program"
                      value={cncProgramName}
                      onChange={(e) => handleFieldChange(setCncProgramName, e.target.value)}
                      placeholder={t("parts.cncProgramPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between p-3 border rounded-md bg-card">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${isBulletCard ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <Label htmlFor="bullet-card" className="cursor-pointer text-sm">{t("parts.bulletCard")}</Label>
                    </div>
                    <Switch id="bullet-card" checked={isBulletCard} onCheckedChange={(checked) => { setIsBulletCard(checked); setHasChanges(true); }} />
                  </div>
                  {cncProgramName && (
                    <div className="sm:col-span-2 flex items-center gap-4 p-3 border rounded-md bg-white">
                      <QRCodeSVG value={cncProgramName} size={64} level="M" includeMargin={false} />
                      <div>
                        <p className="font-mono font-bold text-foreground">{cncProgramName}</p>
                        <p className="text-xs text-muted-foreground">{t("parts.qrCodeDesc")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <IssuesSummarySection partId={partId} />
            </TabsContent>


            <TabsContent value="operations" className="p-4 sm:p-6 space-y-5 m-0">
              <div>
                <Label className="text-lg">{t("qrm.routing")}</Label>
                <div className="mt-3 border rounded-lg p-4 bg-muted">
                  <RoutingVisualization routing={routing} loading={routingLoading} compact />
                </div>
              </div>

              {part?.notes && (
                <div>
                  <Label>{t("parts.notes")}</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{part.notes}</p>
                </div>
              )}

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

              {(parentPart || (childParts && childParts.length > 0)) && (
                <div className="border-t pt-6">
                  <Label className="text-lg flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5" />
                    {t("parts.assemblyRelationships")}
                  </Label>

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

                  {childParts && childParts.length > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {t("parts.childComponents")} ({childParts.length})
                      </Label>

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
                        {childParts.map((child: { id: string; part_number: string; status: string; material?: string; operations?: Array<{ id: string; status: string; operation_name: string }> }) => {
                          const completedOps = child.operations?.filter((op: { status: string }) => op.status === "completed").length || 0;
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
            </TabsContent>

            <TabsContent value="files" className="p-4 sm:p-6 space-y-5 m-0">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-lg flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    {t("parts.files")} ({part?.file_paths?.length || 0})
                  </Label>
                </div>

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

                {uploadProgress.length > 0 && (
                  <UploadProgress progress={uploadProgress} className="mb-4" />
                )}

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

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {t("parts.images.title")} ({part?.image_paths?.length || 0})
                  </Label>
                </div>

                {part?.image_paths && part.image_paths.length > 0 && (
                  <div className="mb-4">
                    <ImageGallery
                      partId={partId}
                      imagePaths={part.image_paths}
                      onImageDeleted={async () => {
                                        await queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
                        onUpdate();
                      }}
                      editable={true}
                    />
                  </div>
                )}

                <ImageUpload
                  partId={partId}
                  onUploadComplete={async () => {
                                await queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
                    onUpdate();
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="operations" className="p-4 sm:p-6 space-y-5 m-0">
              <IssuesSummarySection partId={partId} />

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-lg">{t("operations.title")} ({operations?.length || 0})</Label>
                  <Button size="sm" onClick={() => setAddingOperation(true)}>
                    <Plus className="h-4 w-4 mr-2" /> {t("operations.addOperation")}
                  </Button>
                </div>

                {addingOperation && (
                  <div className="border rounded-lg p-3 sm:p-4 mb-4 bg-alert-info-bg border-alert-info-border">
                    <h4 className="font-semibold mb-3 text-sm sm:text-base">{t("operations.newOperation")}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            {cells?.map((cell: { id: string; name: string }) => (
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
                      <div className="sm:col-span-2">
                        <Label>{t("operations.notes")}</Label>
                        <Textarea
                          value={newOperation.notes}
                          onChange={(e) =>
                            setNewOperation({ ...newOperation, notes: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="h-4 w-4 text-orange-600" />
                          <Label>{t("operations.requiredResourcesOptional")}</Label>
                        </div>

                        <Select
                          onValueChange={(resourceId) => {
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
                              .map((resource: { id: string; name: string; type: string }) => (
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
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                <div className="space-y-2">
                  {(operations as unknown as { id: string; operation_name: string; sequence: number; estimated_time: number | null; status: string; resources_count: number; cell?: { name: string; color: string | null }; assigned_operator?: { full_name: string } | null }[])?.map((op) => (
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
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>

      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl flex flex-col p-0 gap-0 border-0 bg-transparent shadow-2xl rounded-none sm:rounded-xl overflow-hidden inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <div className="relative flex-1 min-h-0 bg-background sm:rounded-xl overflow-hidden">
            <div className="absolute top-2 left-3 z-10 max-w-[60%]">
              <span className="text-[11px] text-muted-foreground/70 font-medium truncate block">{currentFileTitle}</span>
            </div>
            <DialogTitle className="sr-only">{currentFileTitle}</DialogTitle>
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
