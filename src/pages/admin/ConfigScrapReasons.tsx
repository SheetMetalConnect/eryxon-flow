import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingReason, setEditingReason] = useState<Partial<ScrapReason> | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scrap Reasons Configuration</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingReason({}); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Scrap Reason
          </Button>
          <Button variant="outline" onClick={handleSeedDefaults} disabled={seedDefaultMutation.isPending}>
            <Package className="h-4 w-4 mr-2" />
            {seedDefaultMutation.isPending ? "Seeding..." : "Seed Default Reasons"}
          </Button>
        </div>
      </div>
      <Card>
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
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : scrapReasons?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No scrap reasons found</TableCell></TableRow>
              ) : (
                scrapReasons?.map((reason) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
