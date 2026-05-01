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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { useProfile } from "@/hooks/useProfile";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePMI, isPMIServiceEnabled } from "@/hooks/usePMI";
import { fetchChildParts, fetchParentPart, checkAssemblyDependencies } from "@/lib/database";
import { useTranslation } from "react-i18next";
import { usePartRouting } from "@/hooks/useQRMMetrics";
import { logger } from '@/lib/logger';
import { PartDetailsTab } from "./PartDetailsTab";
import { PartOperationsTab } from "./PartOperationsTab";
import { PartFilesTab } from "./PartFilesTab";

interface PartDetailModalProps {
  partId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PartDetailModal({ partId, onClose, onUpdate }: PartDetailModalProps) {
  const profile = useProfile();
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

  const { data: childParts } = useQuery({
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
        (file) => `${profile.tenant_id}/parts/${partId}/${file.name}`,
        {
          allowedExtensions: ["step", "stp", "pdf"],
          maxFileSizeMB: 100,
          validateQuota: true,
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

  const handleInvalidateAndUpdate = async () => {
    await queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
    onUpdate();
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
            <TabsContent value="details" className="m-0">
              <PartDetailsTab
                partId={partId}
                part={part}
                cells={cells}
                operations={operations}
                routing={routing}
                routingLoading={routingLoading}
                drawingNo={drawingNo}
                setDrawingNo={setDrawingNo}
                cncProgramName={cncProgramName}
                setCncProgramName={setCncProgramName}
                isBulletCard={isBulletCard}
                setIsBulletCard={setIsBulletCard}
                handleFieldChange={handleFieldChange}
                setHasChanges={setHasChanges}
              />
            </TabsContent>

            <TabsContent value="operations" className="m-0">
              <PartOperationsTab
                partId={partId}
                part={part}
                operations={operations}
                routing={routing}
                routingLoading={routingLoading}
                parentPart={parentPart}
                childParts={childParts}
                dependencies={dependencies}
                cells={cells}
                availableResources={availableResources}
                addingOperation={addingOperation}
                setAddingOperation={setAddingOperation}
                newOperation={newOperation}
                setNewOperation={setNewOperation}
                handleAddOperation={handleAddOperation}
                addOperationMutation={addOperationMutation}
              />
            </TabsContent>

            <TabsContent value="files" className="m-0">
              <PartFilesTab
                partId={partId}
                part={part}
                cadFiles={cadFiles}
                setCadFiles={setCadFiles}
                handleCADUpload={handleCADUpload}
                handleViewCADFile={handleViewCADFile}
                handleDeleteCADFile={handleDeleteCADFile}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                onInvalidateAndUpdate={handleInvalidateAndUpdate}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>

      {/* File viewer dialog */}
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
