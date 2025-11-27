import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  Hash
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useScrapReasonUsage } from "@/hooks/useQualityMetrics";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ScrapReason {
  id: string;
  code: string;
  description: string;
  category: string;
  active: boolean;
  created_at: string;
}

const categories = [
  { value: "material", label: "Material", color: "bg-amber-100 text-amber-800" },
  { value: "process", label: "Process", color: "bg-blue-100 text-blue-800" },
  { value: "equipment", label: "Equipment", color: "bg-red-100 text-red-800" },
  { value: "operator", label: "Operator", color: "bg-purple-100 text-purple-800" },
  { value: "design", label: "Design", color: "bg-green-100 text-green-800" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
];

export default function ConfigScrapReasons() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingReason, setEditingReason] = useState<Partial<ScrapReason> | null>(null);

  // Fetch usage statistics
  const { data: usageStats } = useScrapReasonUsage();

  const { data: scrapReasons, isLoading } = useQuery({
    queryKey: ["scrap-reasons", selectedCategory, activeOnly, searchQuery],
    queryFn: async () => {
      let query = supabase.from("scrap_reasons").select("*");
      if (selectedCategory !== "all") query = query.eq("category", selectedCategory);
      if (activeOnly) query = query.eq("active", true);
      if (searchQuery) query = query.or(`code.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      const { data, error } = await query.order("code");
      if (error) throw error;
      return data as ScrapReason[];
    },
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("seed_default_scrap_reasons" as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Default scrap reasons created successfully");
      queryClient.invalidateQueries({ queryKey: ["scrap-reasons"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to seed default reasons"),
  });

  const saveMutation = useMutation({
    mutationFn: async (reason: Partial<ScrapReason>) => {
      if (reason.id) {
        const { data, error } = await supabase.from("scrap_reasons")
          .update({ code: reason.code, description: reason.description, category: reason.category, active: reason.active })
          .eq("id", reason.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("scrap_reasons")
          .insert({ tenant_id: profile?.tenant_id, code: reason.code, description: reason.description,
            category: reason.category, active: reason.active ?? true }).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id ? "Scrap reason updated" : "Scrap reason created");
      queryClient.invalidateQueries({ queryKey: ["scrap-reasons"] });
      setDialogOpen(false);
      setEditingReason(null);
    },
    onError: (error: any) => toast.error(error.message || "Failed to save scrap reason"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scrap_reasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scrap reason deleted");
      queryClient.invalidateQueries({ queryKey: ["scrap-reasons"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to delete scrap reason"),
  });

  const handleSave = () => {
    if (!editingReason?.code || !editingReason?.description || !editingReason?.category) {
      toast.error("Code, description, and category are required");
      return;
    }
    saveMutation.mutate(editingReason);
  };

  const handleDelete = async (reason: ScrapReason) => {
    if (confirm(`Delete scrap reason "${reason.code}"? This action cannot be undone.`)) {
      deleteMutation.mutate(reason.id);
    }
  };

  const handleSeedDefaults = () => {
    if (confirm("This will create 30+ standard scrap reason codes. Continue?")) {
      seedDefaultMutation.mutate();
    }
  };

  const getCategoryColor = (category: string) => {
    return categories.find((c) => c.value === category)?.color || "bg-gray-100 text-gray-800";
  };

  // Compute usage analytics
  const analytics = useMemo(() => {
    if (!usageStats) return null;

    const totalUsage = usageStats.reduce((sum, r) => sum + r.usageCount, 0);
    const totalScrapQty = usageStats.reduce((sum, r) => sum + r.totalScrapQuantity, 0);
    const activeReasons = usageStats.filter((r) => r.active).length;
    const usedReasons = usageStats.filter((r) => r.usageCount > 0).length;
    const unusedReasons = usageStats.filter((r) => r.usageCount === 0 && r.active).length;

    // Get top 5 most used reasons
    const topReasons = [...usageStats]
      .sort((a, b) => b.totalScrapQuantity - a.totalScrapQuantity)
      .slice(0, 5)
      .filter((r) => r.totalScrapQuantity > 0);

    // Group by category
    const byCategory = categories.map((cat) => ({
      ...cat,
      count: usageStats.filter((r) => r.category === cat.value).length,
      totalScrap: usageStats
        .filter((r) => r.category === cat.value)
        .reduce((sum, r) => sum + r.totalScrapQuantity, 0),
    }));

    return {
      totalReasons: usageStats.length,
      activeReasons,
      usedReasons,
      unusedReasons,
      totalUsage,
      totalScrapQty,
      topReasons,
      byCategory,
    };
  }, [usageStats]);

  // Create a map for quick lookup of usage stats
  const usageMap = useMemo(() => {
    if (!usageStats) return new Map();
    return new Map(usageStats.map((u) => [u.id, u]));
  }, [usageStats]);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          Scrap Reasons Configuration
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage scrap reason codes for quality tracking and root cause analysis
        </p>
      </div>

      <hr className="title-divider" />

      {/* Usage Statistics Dashboard */}
      {analytics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Total Reasons */}
            <Card className="glass-card transition-smooth hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                    <Hash className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{analytics.totalReasons}</div>
                    <div className="text-xs text-muted-foreground">{t("quality.totalReasons", "Total Reasons")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active */}
            <Card className="glass-card transition-smooth hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--color-success))]/10">
                    <Activity className="h-4 w-4 text-[hsl(var(--color-success))]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[hsl(var(--color-success))]">{analytics.activeReasons}</div>
                    <div className="text-xs text-muted-foreground">{t("quality.activeReasons", "Active")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Used */}
            <Card className="glass-card transition-smooth hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--color-info))]/10">
                    <TrendingUp className="h-4 w-4 text-[hsl(var(--color-info))]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{analytics.usedReasons}</div>
                    <div className="text-xs text-muted-foreground">{t("quality.usedReasons", "Used")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unused */}
            <Card className={cn(
              "glass-card transition-smooth hover:scale-[1.02]",
              analytics.unusedReasons > 0 && "border-[hsl(var(--color-warning))]/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                    <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-warning))]" />
                  </div>
                  <div>
                    <div className={cn(
                      "text-xl font-bold",
                      analytics.unusedReasons > 0 && "text-[hsl(var(--color-warning))]"
                    )}>{analytics.unusedReasons}</div>
                    <div className="text-xs text-muted-foreground">{t("quality.unusedReasons", "Unused")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Usage */}
            <Card className="glass-card transition-smooth hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--color-error))]/10">
                    <BarChart3 className="h-4 w-4 text-[hsl(var(--color-error))]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{analytics.totalUsage}</div>
                    <div className="text-xs text-muted-foreground">{t("quality.timesUsed", "Times Used")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Scrap Qty */}
            <Card className="glass-card transition-smooth hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--color-error))]/10">
                    <Trash2 className="h-4 w-4 text-[hsl(var(--color-error))]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[hsl(var(--color-error))]">
                      {analytics.totalScrapQty.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("quality.totalScrapped", "Total Scrapped")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Reasons and Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Scrap Reasons */}
            {analytics.topReasons.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                    {t("quality.topScrapReasons", "Top Scrap Reasons")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {analytics.topReasons.map((reason, index) => (
                      <div key={reason.id} className="flex items-center gap-3">
                        <div className="w-6 text-xs text-muted-foreground font-medium">#{index + 1}</div>
                        <Badge className={getCategoryColor(reason.category)} variant="outline">
                          {reason.code}
                        </Badge>
                        <div className="flex-1 text-xs text-muted-foreground truncate">
                          {reason.description}
                        </div>
                        <div className="text-sm font-medium text-[hsl(var(--color-error))]">
                          {reason.totalScrapQuantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By Category */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                  {t("quality.scrapByCategory", "Scrap by Category")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {analytics.byCategory.filter((c) => c.totalScrap > 0).map((cat) => (
                    <div key={cat.value} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-muted-foreground">{cat.label}</div>
                      <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", cat.color.replace('text-', 'bg-').replace('-800', '-500'))}
                          style={{
                            width: `${analytics.totalScrapQty > 0 ? (cat.totalScrap / analytics.totalScrapQty) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <div className="w-12 text-xs font-medium text-right">{cat.totalScrap}</div>
                    </div>
                  ))}
                  {analytics.byCategory.filter((c) => c.totalScrap > 0).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      {t("quality.noScrapData", "No scrap data recorded yet")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button onClick={() => { setEditingReason({}); setDialogOpen(true); }} className="cta-button">
            <Plus className="h-4 w-4 mr-2" /> Add Scrap Reason
          </Button>
          <Button variant="outline" onClick={handleSeedDefaults} disabled={seedDefaultMutation.isPending}>
            <Package className="h-4 w-4 mr-2" />
            {seedDefaultMutation.isPending ? "Seeding..." : "Seed Default Reasons"}
          </Button>
        </div>
      </div>
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Search</Label>
              <Input placeholder="Search by code or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="w-48">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
              <Label htmlFor="active-only">Active Only</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">{t("quality.usage", "Usage")}</TableHead>
                <TableHead className="text-center">{t("quality.scrapped", "Scrapped")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : scrapReasons?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No scrap reasons found</TableCell></TableRow>
              ) : (
                scrapReasons?.map((reason) => {
                  const usage = usageMap.get(reason.id);
                  return (
                    <TableRow key={reason.id}>
                      <TableCell className="font-medium">{reason.code}</TableCell>
                      <TableCell>{reason.description}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(reason.category)}>
                          {categories.find((c) => c.value === reason.category)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={reason.active ? "default" : "secondary"}>{reason.active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium",
                          (usage?.usageCount || 0) > 0 ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {usage?.usageCount || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium",
                          (usage?.totalScrapQuantity || 0) > 0 ? "text-[hsl(var(--color-error))]" : "text-muted-foreground"
                        )}>
                          {usage?.totalScrapQuantity?.toLocaleString() || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingReason(reason); setDialogOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(reason)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{editingReason?.id ? "Edit Scrap Reason" : "Add Scrap Reason"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Code *</Label>
              <Input value={editingReason?.code || ""} onChange={(e) => setEditingReason({ ...editingReason, code: e.target.value })} placeholder="e.g., PROC-001" />
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={editingReason?.description || ""} onChange={(e) => setEditingReason({ ...editingReason, description: e.target.value })} placeholder="e.g., Bend angle out of tolerance" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={editingReason?.category} onValueChange={(value) => setEditingReason({ ...editingReason, category: value })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-active" checked={editingReason?.active ?? true} onCheckedChange={(checked) => setEditingReason({ ...editingReason, active: checked })} />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
