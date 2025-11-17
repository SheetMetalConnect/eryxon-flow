import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Infinity, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCellQRMMetrics } from "@/hooks/useQRMMetrics";
import { WIPIndicator } from "@/components/qrm/WIPIndicator";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sequence: number;
  active: boolean;
  wip_limit: number | null;
  wip_warning_threshold: number | null;
  enforce_wip_limit: boolean | null;
  show_capacity_warning: boolean | null;
}

export default function ConfigStages() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    active: true,
    wip_limit: null as number | null,
    wip_warning_threshold: null as number | null,
    enforce_wip_limit: false,
    show_capacity_warning: true,
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadStages();
  }, [profile?.tenant_id]);

  const loadStages = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("cells")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("sequence");

    if (!error && data) {
      setStages(data as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingStage) {
        // Update existing stage
        await supabase
          .from("cells")
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            active: formData.active,
            wip_limit: formData.wip_limit,
            wip_warning_threshold: formData.wip_warning_threshold,
            enforce_wip_limit: formData.enforce_wip_limit,
            show_capacity_warning: formData.show_capacity_warning,
          })
          .eq("id", editingStage.id);

        toast.success(t("stages.stageUpdated"));
      } else {
        // Create new cell
        const maxSequence = Math.max(...stages.map((s) => s.sequence), 0);
        await supabase.from("cells").insert({
          tenant_id: profile.tenant_id,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          sequence: maxSequence + 1,
          active: formData.active,
          wip_limit: formData.wip_limit,
          wip_warning_threshold: formData.wip_warning_threshold,
          enforce_wip_limit: formData.enforce_wip_limit,
          show_capacity_warning: formData.show_capacity_warning,
        });

        toast.success(t("stages.stageCreated"));
      }

      setDialogOpen(false);
      resetForm();
      loadStages();
    } catch (error) {
      toast.error(t("stages.failedToSaveStage"));
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      active: true,
      wip_limit: null,
      wip_warning_threshold: null,
      enforce_wip_limit: false,
      show_capacity_warning: true,
    });
    setEditingStage(null);
  };

  const handleEdit = (stage: Stage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || "",
      color: stage.color || "#3b82f6",
      active: stage.active,
      wip_limit: stage.wip_limit,
      wip_warning_threshold: stage.wip_warning_threshold,
      enforce_wip_limit: stage.enforce_wip_limit ?? false,
      show_capacity_warning: stage.show_capacity_warning ?? true,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("stages.title")}</h1>
            <p className="text-muted-foreground">{t("stages.manageStages")}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("stages.createStage")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStage ? t("stages.editStage") : t("stages.createNewStage")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("stages.stageName")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("stages.description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">{t("stages.color")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="active">{t("stages.active")}</Label>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                </div>

                {/* QRM Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm">{t("qrm.settings", "QRM Settings")}</h3>

                  <div className="space-y-2">
                    <Label htmlFor="wip_limit">{t("qrm.wipLimit", "WIP Limit")}</Label>
                    <Input
                      id="wip_limit"
                      type="number"
                      min="0"
                      value={formData.wip_limit ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wip_limit: e.target.value ? parseInt(e.target.value) : null
                        })
                      }
                      placeholder={t("qrm.unlimited", "Unlimited")}
                    />
                    <p className="text-xs text-gray-500">
                      {t("qrm.wipLimitHelp", "Maximum work-in-progress items allowed (leave empty for unlimited)")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wip_warning_threshold">
                      {t("qrm.wipWarningThreshold", "Warning Threshold")}
                    </Label>
                    <Input
                      id="wip_warning_threshold"
                      type="number"
                      min="0"
                      value={formData.wip_warning_threshold ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wip_warning_threshold: e.target.value ? parseInt(e.target.value) : null
                        })
                      }
                      placeholder={t("qrm.autoCalculate", "Auto (80% of limit)")}
                      disabled={!formData.wip_limit}
                    />
                    <p className="text-xs text-gray-500">
                      {t("qrm.wipWarningHelp", "Show warning when WIP reaches this count")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="enforce_wip_limit">
                        {t("qrm.enforceLimit", "Enforce WIP Limit")}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {t("qrm.enforceLimitHelp", "Prevent starting new work when at capacity")}
                      </p>
                    </div>
                    <Switch
                      id="enforce_wip_limit"
                      checked={formData.enforce_wip_limit}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, enforce_wip_limit: checked })
                      }
                      disabled={!formData.wip_limit}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="show_capacity_warning">
                        {t("qrm.showWarnings", "Show Capacity Warnings")}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {t("qrm.showWarningsHelp", "Display visual warnings for capacity")}
                      </p>
                    </div>
                    <Switch
                      id="show_capacity_warning"
                      checked={formData.show_capacity_warning}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, show_capacity_warning: checked })
                      }
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingStage ? t("stages.updateStage") : t("stages.createStage")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stages List */}
        <div className="grid gap-4">
          {stages.map((stage) => (
            <Card key={stage.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="h-8 w-8 rounded"
                      style={{ backgroundColor: stage.color || "#94a3b8" }}
                    />
                    <div className="flex-1">
                      <CardTitle>{stage.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{t("stages.sequence")}: {stage.sequence}</Badge>
                        <Badge variant={stage.active ? "default" : "secondary"}>
                          {stage.active ? t("stages.active") : t("stages.inactive")}
                        </Badge>
                        {stage.wip_limit !== null ? (
                          <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t("qrm.wipLimit", "WIP Limit")}: {stage.wip_limit}
                            {stage.enforce_wip_limit && " (enforced)"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-gray-500">
                            <Infinity className="h-3 w-3" />
                            {t("qrm.noLimit", "No WIP Limit")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(stage)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stage.description && (
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                )}
                {stage.wip_limit !== null && profile?.tenant_id && (
                  <StageWIPDisplay stageId={stage.id} tenantId={profile.tenant_id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

// Component to display WIP metrics for a stage
function StageWIPDisplay({ stageId, tenantId }: { stageId: string; tenantId: string }) {
  const { metrics, loading } = useCellQRMMetrics(stageId, tenantId);
  const { t } = useTranslation();

  if (loading || !metrics) {
    return (
      <div className="text-sm text-gray-500">
        {t("qrm.loadingMetrics", "Loading WIP metrics...")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("qrm.currentWIP", "Current WIP")}</span>
        <WIPIndicator metrics={metrics} compact />
      </div>
      {metrics.jobs_in_cell && metrics.jobs_in_cell.length > 0 && (
        <div className="text-xs text-gray-600">
          {t("qrm.jobsInCell", "Jobs")}: {metrics.jobs_in_cell.map((j) => j.job_number).join(", ")}
        </div>
      )}
    </div>
  );
}
