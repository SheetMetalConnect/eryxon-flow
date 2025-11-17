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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Loader2, Wrench, Package2, Settings } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MetadataInput } from "@/components/ui/MetadataInput";
import { BaseMetadata } from "@/types/metadata";

interface Resource {
  id: string;
  name: string;
  type: string;
  description: string | null;
  identifier: string | null;
  location: string | null;
  status: string;
  active: boolean;
  metadata: any;
}

const RESOURCE_TYPES = [
  { value: "tooling", label: "Tooling", icon: Wrench },
  { value: "fixture", label: "Fixture", icon: Settings },
  { value: "mold", label: "Mold", icon: Package2 },
  { value: "material", label: "Material", icon: Package2 },
  { value: "other", label: "Other", icon: Settings },
];

const RESOURCE_STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "bg-green-100 text-green-800" },
  { value: "in_use", label: "In Use", color: "bg-blue-100 text-blue-800" },
  { value: "maintenance", label: "Maintenance", color: "bg-yellow-100 text-yellow-800" },
  { value: "retired", label: "Retired", color: "bg-gray-100 text-gray-800" },
];

export default function ConfigResources() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    type: "tooling",
    description: "",
    identifier: "",
    location: "",
    status: "available",
    active: true,
    metadata: {} as BaseMetadata,
  });

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadResources();
  }, [profile?.tenant_id]);

  const loadResources = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("type")
      .order("name");

    if (!error && data) {
      setResources(data as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingResource) {
        // Update existing resource
        await supabase
          .from("resources")
          .update({
            name: formData.name,
            type: formData.type,
            description: formData.description || null,
            identifier: formData.identifier || null,
            location: formData.location || null,
            status: formData.status,
            active: formData.active,
            metadata: Object.keys(formData.metadata).length > 0 ? formData.metadata : null,
          })
          .eq("id", editingResource.id);

        toast.success(t('resources.updated'));
      } else {
        // Create new resource
        await supabase.from("resources").insert({
          tenant_id: profile.tenant_id,
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          identifier: formData.identifier || null,
          location: formData.location || null,
          status: formData.status,
          active: formData.active,
          metadata: Object.keys(formData.metadata).length > 0 ? formData.metadata : null,
        });

        toast.success(t('resources.created'));
      }

      setDialogOpen(false);
      resetForm();
      loadResources();
    } catch (error) {
      toast.error(t('resources.failedToSave'));
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "tooling",
      description: "",
      identifier: "",
      location: "",
      status: "available",
      active: true,
      metadata: {},
    });
    setEditingResource(null);
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      description: resource.description || "",
      identifier: resource.identifier || "",
      location: resource.location || "",
      status: resource.status,
      active: resource.active,
      metadata: resource.metadata || {},
    });
    setDialogOpen(true);
  };

  const filteredResources = filterType === "all"
    ? resources
    : resources.filter(r => r.type === filterType);

  const getResourceTypeIcon = (type: string) => {
    const resourceType = RESOURCE_TYPES.find(t => t.value === type);
    const Icon = resourceType?.icon || Settings;
    return <Icon className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = RESOURCE_STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={statusOption?.color || "bg-gray-100 text-gray-800"} variant="outline">
        {statusOption?.label || status}
      </Badge>
    );
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
            <h1 className="text-3xl font-bold mb-2">{t('resources.title')}</h1>
            <p className="text-muted-foreground">{t('resources.description')}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('resources.addResource')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingResource ? t('resources.editResource') : t('resources.createResource')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('resources.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t('resources.namePlaceholder')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">{t('resources.type')} *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier">{t('resources.identifier')}</Label>
                    <Input
                      id="identifier"
                      value={formData.identifier}
                      onChange={(e) =>
                        setFormData({ ...formData, identifier: e.target.value })
                      }
                      placeholder={t('resources.identifierPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">{t('resources.location')}</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder={t('resources.locationPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">{t('resources.status')}</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="active">{t('resources.active')}</Label>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, active: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('resources.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t('resources.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                {/* Metadata Input */}
                <div className="pt-2">
                  <MetadataInput
                    value={formData.metadata}
                    onChange={(metadata) =>
                      setFormData({ ...formData, metadata })
                    }
                    category="resource"
                    resourceType={formData.type}
                    label="Resource Details"
                    description="Add specific details like tool specifications, mold settings, or material properties"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    {t('resources.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingResource ? t('resources.update') : t('resources.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            {t('resources.all')} ({resources.length})
          </Button>
          {RESOURCE_TYPES.map((type) => {
            const count = resources.filter(r => r.type === type.value).length;
            return (
              <Button
                key={type.value}
                variant={filterType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type.value)}
              >
                {type.label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getResourceTypeIcon(resource.type)}
                    <CardTitle className="text-lg">{resource.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(resource)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="capitalize">
                      {RESOURCE_TYPES.find(t => t.value === resource.type)?.label || resource.type}
                    </Badge>
                    {getStatusBadge(resource.status)}
                    {!resource.active && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {t('resources.inactive')}
                      </Badge>
                    )}
                  </div>

                  {resource.identifier && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t('resources.id')}:</span> {resource.identifier}
                    </p>
                  )}

                  {resource.location && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t('resources.location')}:</span> {resource.location}
                    </p>
                  )}

                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {filterType === "all" ? t('resources.noResources') : t('resources.noResourcesOfType', { type: filterType })}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {filterType === "all"
                  ? t('resources.addFirstResource')
                  : t('resources.addResourcesOfType')}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('resources.addResource')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
