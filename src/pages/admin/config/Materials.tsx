import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Material {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
}

export default function ConfigMaterials() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#94a3b8",
    active: true,
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadMaterials();
  }, [profile?.tenant_id]);

  const loadMaterials = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("name");

    if (!error && data) {
      setMaterials(data as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingMaterial) {
        // Update existing material
        await supabase
          .from("materials")
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            active: formData.active,
          })
          .eq("id", editingMaterial.id);

        toast.success(t("materials.materialUpdated"));
      } else {
        // Create new material
        await supabase.from("materials").insert({
          tenant_id: profile.tenant_id,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          active: formData.active,
        });

        toast.success(t("materials.materialCreated"));
      }

      setDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch (error) {
      toast.error(t("materials.failedToSaveMaterial"));
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#94a3b8",
      active: true,
    });
    setEditingMaterial(null);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      description: material.description || "",
      color: material.color || "#94a3b8",
      active: material.active,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t("materials.title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("materials.manageMaterials")}</p>
        </div>

        <hr className="title-divider" />

        <div className="flex justify-end">

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="cta-button gap-2">
                <Plus className="h-4 w-4" />
                {t("materials.createMaterial")}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card overflow-hidden flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle>
                  {editingMaterial ? t("materials.editMaterial") : t("materials.createNewMaterial")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("materials.materialName")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("materials.materialNamePlaceholder")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("materials.description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t("materials.descriptionPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">{t("materials.color")}</Label>
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
                      placeholder="#94a3b8"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="active">{t("materials.active")}</Label>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                </div>

                </div>
                <div className="shrink-0 border-t pt-4 mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    {t("materials.cancel")}
                  </Button>
                  <Button type="submit">
                    {editingMaterial ? t("materials.update") : t("materials.create")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <Card key={material.id} className="glass-card hover:shadow-xl hover:scale-105 transition-all hover:border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{
                        backgroundColor: material.color || "#94a3b8",
                        borderColor: material.color || "#94a3b8",
                      }}
                    />
                    <CardTitle className="text-lg">{material.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(material)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {material.description && (
                    <p className="text-sm text-muted-foreground">
                      {material.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={material.active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {material.active ? t("materials.active") : t("materials.inactive")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {materials.length === 0 && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t("materials.noMaterialsConfigured")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("materials.addFirstMaterial")}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("materials.createMaterial")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
