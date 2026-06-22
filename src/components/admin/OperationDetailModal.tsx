import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryKeys } from "@/lib/queryClient";
import { resourceStatusBadgeClass, resourceStatusLabel } from "@/lib/resource-status";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
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
  Zap,
  TimerReset,
  Cpu,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { logger } from '@/lib/logger';
import { useOperationBookedHours } from "@/hooks/useOperationBookedHours";
import { useUpdateOperationPlan } from "@/hooks/useUpdateOperationPlan";

interface OperationDetailModalProps {
  operationId: string;
  onClose: () => void;
  onUpdate: () => void;
}

/** ISO timestamp -> value for <input type="datetime-local"> (local time, no seconds). */
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minutes -> "Hh Mmin" with minute precision, e.g. 90 -> "1.50 h (90 min)". */
function formatHoursFromMinutes(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(2)} h · ${Math.round(minutes)} min`;
}

export default function OperationDetailModal({
  operationId,
  onClose,
  onUpdate,
}: OperationDetailModalProps) {
  const { t } = useTranslation();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<"step" | "pdf" | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");

  const { data: operation, isLoading } = useQuery({
    queryKey: QueryKeys.operations.detail(operationId),
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
            cnc_program_name,
            is_bullet_card,
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

  const { data: resources } = useQuery({
    queryKey: QueryKeys.operations.resources(operationId),
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

  const { data: operators } = useQuery({
    queryKey: QueryKeys.profiles.operators(profile?.tenant_id || ""),
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

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "not_started" | "in_progress" | "completed" | "on_hold") => {
      const { error } = await supabase
        .from("operations")
        .update({ status: newStatus })
        .eq("id", operationId);

      if (error) throw error;
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.operations.detail(operationId) });
      const previous = queryClient.getQueryData(QueryKeys.operations.detail(operationId));
      queryClient.setQueryData(QueryKeys.operations.detail(operationId), (old: Record<string, unknown> | undefined) =>
        old ? { ...old, status: newStatus } : old
      );
      return { previous };
    },
    onError: (error: Error, _newStatus, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QueryKeys.operations.detail(operationId), context.previous);
      }
      toast.error(t("notifications.error"), {
        description: error.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.operations.detail(operationId) });
      onUpdate();
    },
    onSuccess: () => {
      toast.success(t("notifications.updated"), {
        description: t("operations.statusUpdatedDesc"),
      });
    },
  });

  const updateBulletCardMutation = useMutation({
    mutationFn: async (isBulletCard: boolean) => {
      if (!operation?.parts?.id) return;
      const { error } = await supabase
        .from("parts")
        .update({ is_bullet_card: isBulletCard })
        .eq("id", operation.parts.id);
      if (error) throw error;
    },
    onSuccess: (_data, isBulletCard) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.operations.detail(operationId) });
      onUpdate();
      toast.success(t("notifications.updated"), {
        description: isBulletCard
          ? t("qrm.bulletCardApplied")
          : t("qrm.bulletCardRemoved"),
      });
    },
    onError: (error: Error) => {
      toast.error(t("notifications.error"), { description: error.message });
    },
  });

  const updatePlanMutation = useUpdateOperationPlan(operationId);

  const bookedHours = useOperationBookedHours(
    operationId,
    operation?.estimated_time ?? 0,
  );

  // Editable plan fields — seeded from the operation, then user-correctable.
  const [planHours, setPlanHours] = useState("");
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");
  const [planDirty, setPlanDirty] = useState(false);

  useEffect(() => {
    if (!operation) return;
    const minutes = operation.estimated_time ?? 0;
    setPlanHours(minutes ? (minutes / 60).toFixed(2) : "");
    setPlanStart(toDateTimeLocal(operation.planned_start));
    setPlanEnd(toDateTimeLocal(operation.planned_end));
    setPlanDirty(false);
  }, [operation]);

  const handleSavePlan = () => {
    const hoursNum = parseFloat(planHours.replace(",", "."));
    updatePlanMutation.mutate(
      {
        estimated_time:
          planHours.trim() === "" || Number.isNaN(hoursNum)
            ? 0
            : Math.round(hoursNum * 60),
        planned_start: planStart ? new Date(planStart).toISOString() : null,
        planned_end: planEnd ? new Date(planEnd).toISOString() : null,
      },
      {
        onSuccess: () => {
          setPlanDirty(false);
          toast.success(t("notifications.updated"), { description: t("qrm.planSaved") });
        },
        onError: (error: Error) => {
          toast.error(t("notifications.error"), {
            description: error.message || t("qrm.planSaveFailed"),
          });
        },
      },
    );
  };

  const assignOperatorMutation = useMutation({
    mutationFn: async (operatorId: string | null) => {
      const { error } = await supabase
        .from("operations")
        .update({ assigned_operator_id: operatorId })
        .eq("id", operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.operations.detail(operationId) });
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
    } catch (error: unknown) {
      logger.error('OperationDetailModal', 'Error opening file', error);
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
    const badgeStatus: Record<string, "pending" | "active" | "completed" | "on-hold"> = {
      not_started: "pending",
      in_progress: "active",
      completed: "completed",
      on_hold: "on-hold",
    };
    const labels: Record<string, string> = {
      not_started: t("operations.status.notStarted"),
      in_progress: t("operations.status.inProgress"),
      completed: t("operations.status.completed"),
      on_hold: t("operations.status.onHold"),
    };
    return (
      <StatusBadge
        status={badgeStatus[status] || "pending"}
        label={labels[status] || status}
      />
    );
  };

  const stepFiles =
    operation?.parts?.file_paths?.filter((f: string) => {
      const ext = f.split(".").pop()?.toLowerCase();
      return ext === "step" || ext === "stp";
    }) || [];
  const pdfFiles =
    operation?.parts?.file_paths?.filter(
      (f: string) => f.split(".").pop()?.toLowerCase() === "pdf"
    ) || [];

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
              <TabsContent value="details" className="p-4 sm:p-6 space-y-5 m-0">
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
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("qrm.plannedHours")}</p>
                    <p className="mt-1 font-semibold text-sm">
                      {operation?.estimated_time ? formatHoursFromMinutes(operation.estimated_time) : "-"}
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

                {/* PLANNED HOURS — estimated_time editable post-create, plus planned window */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">{t("qrm.plannedHours")}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("qrm.plannedHoursDesc")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="plan-hours" className="text-xs text-muted-foreground">
                        {t("qrm.plannedHours")} ({t("qrm.hours")})
                      </Label>
                      <Input
                        id="plan-hours"
                        type="number"
                        step="0.01"
                        min="0"
                        value={planHours}
                        onChange={(e) => { setPlanHours(e.target.value); setPlanDirty(true); }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-start" className="text-xs text-muted-foreground">
                        {t("qrm.plannedStart")}
                      </Label>
                      <Input
                        id="plan-start"
                        type="datetime-local"
                        value={planStart}
                        onChange={(e) => { setPlanStart(e.target.value); setPlanDirty(true); }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-end" className="text-xs text-muted-foreground">
                        {t("qrm.plannedEnd")}
                      </Label>
                      <Input
                        id="plan-end"
                        type="datetime-local"
                        value={planEnd}
                        onChange={(e) => { setPlanEnd(e.target.value); setPlanDirty(true); }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSavePlan}
                      disabled={!planDirty || updatePlanMutation.isPending}
                      className="gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      {t("qrm.savePlan")}
                    </Button>
                  </div>
                </div>

                {/* BOOKED HOURS — summed time_entries + drill-down + planned vs booked */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TimerReset className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{t("qrm.bookedHours")}</h4>
                    </div>
                    {bookedHours.activeCount > 0 && (
                      <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                        <Play className="h-3 w-3 mr-1" />
                        {t("qrm.activeNow")} ({bookedHours.activeCount})
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("qrm.bookedHoursDesc")}</p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 rounded-md bg-muted/40 border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("qrm.plannedHours")}</p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {formatHoursFromMinutes(bookedHours.plannedVsBooked.plannedMinutes)}
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/40 border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("qrm.bookedHours")}</p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {formatHoursFromMinutes(bookedHours.totalMinutes)}
                      </p>
                    </div>
                    <div className={`p-2 rounded-md border ${bookedHours.plannedVsBooked.isOverScheduled ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" : "bg-muted/40"}`}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("qrm.variance")}</p>
                      <p className={`mt-0.5 text-sm font-semibold ${bookedHours.plannedVsBooked.isOverScheduled ? "text-amber-700 dark:text-amber-300" : ""}`}>
                        {bookedHours.plannedVsBooked.varianceMinutes > 0 ? "+" : ""}
                        {bookedHours.plannedVsBooked.varianceMinutes} min
                        {bookedHours.plannedVsBooked.isOverScheduled && (
                          <span className="ml-1 text-[10px] font-normal">{t("qrm.overPlanned")}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {bookedHours.entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">{t("qrm.noBookedHours")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">{t("qrm.bookedEntries")}</p>
                      {bookedHours.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-2 text-sm p-2 rounded-md bg-muted/20 border"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{entry.operator_name || t("operations.unassigned")}</span>
                            {entry.isActive && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(entry.start_time), "MMM dd HH:mm")}
                              {" – "}
                              {entry.end_time ? format(new Date(entry.end_time), "HH:mm") : t("qrm.activeNow")}
                            </span>
                            <span className="font-semibold text-foreground">{Math.round(entry.minutes)} min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* NC CODE — read-only display of the part's cnc_program_name (edit on part detail) */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">{t("qrm.ncCode")}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("qrm.ncCodeDesc")}</p>
                  {operation?.parts?.cnc_program_name ? (
                    <div className="flex items-center gap-4 p-3 border rounded-md bg-white">
                      <QRCodeSVG value={operation.parts.cnc_program_name} size={64} level="M" includeMargin={false} />
                      <p className="font-mono font-bold text-foreground break-all">
                        {operation.parts.cnc_program_name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{t("qrm.noNcCode")}</p>
                  )}
                </div>

                {/* QRM CARDS — canonical admin apply path for Bullet Card + Yellow Card */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold">{t("qrm.cardsSection")}</h4>

                  <div className="flex items-center justify-between gap-2 p-3 border rounded-md bg-card">
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className={`h-4 w-4 shrink-0 ${operation?.parts?.is_bullet_card ? "text-destructive" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <Label htmlFor="qrm-bullet-card" className="cursor-pointer text-sm">{t("qrm.bulletCard")}</Label>
                        <p className="text-xs text-muted-foreground">{t("qrm.bulletCardDesc")}</p>
                      </div>
                    </div>
                    <Switch
                      id="qrm-bullet-card"
                      checked={!!operation?.parts?.is_bullet_card}
                      disabled={updateBulletCardMutation.isPending}
                      onCheckedChange={(checked) => updateBulletCardMutation.mutate(checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3 border rounded-md bg-card">
                    <div className="flex items-center gap-2 min-w-0">
                      <Pause className={`h-4 w-4 shrink-0 ${operation?.status === "on_hold" ? "text-amber-500" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <Label htmlFor="qrm-yellow-card" className="cursor-pointer text-sm">{t("qrm.yellowCard")}</Label>
                        <p className="text-xs text-muted-foreground">{t("qrm.yellowCardDesc")}</p>
                      </div>
                    </div>
                    <Switch
                      id="qrm-yellow-card"
                      checked={operation?.status === "on_hold"}
                      disabled={operation?.status === "completed" || updateStatusMutation.isPending}
                      onCheckedChange={(checked) =>
                        updateStatusMutation.mutate(checked ? "on_hold" : "in_progress")
                      }
                    />
                  </div>
                </div>

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

                {operation?.notes && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t("jobs.notes", "Notes")}</Label>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg border">
                      {operation.notes}
                    </p>
                  </div>
                )}

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
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate("completed")}
                          className="gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {t("operations.complete", "Complete")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              {resourcesCount > 0 && (
                <TabsContent value="resources" className="p-4 sm:p-6 space-y-3 m-0">
                  {resources?.map((r: { id: string; quantity: number; notes: string | null; resource?: { name: string; type: string; identifier?: string | null; location?: string | null; status?: string | null; metadata?: Record<string, unknown> | null } }) => {
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
                              className={`text-xs shrink-0 ${resourceStatusBadgeClass[r.resource.status] || ""}`}
                            >
                              {resourceStatusLabel(t, r.resource.status)}
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

      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl flex flex-col p-0 gap-0 border-0 bg-transparent shadow-2xl rounded-none sm:rounded-xl overflow-hidden inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <div className="relative flex-1 min-h-0 bg-background sm:rounded-xl overflow-hidden">
            <div className="absolute top-2 left-3 z-10 max-w-[60%]">
              <span className="text-[11px] text-muted-foreground/70 font-medium truncate block">{currentFileTitle}</span>
            </div>
            <DialogTitle className="sr-only">{currentFileTitle}</DialogTitle>
            {currentFileType === "step" && currentFileUrl && <STEPViewer url={currentFileUrl} />}
            {currentFileType === "pdf" && currentFileUrl && <PDFViewer url={currentFileUrl} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
