import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
    const [selectedCategory, setSelectedCategory] = useState\u003cstring\u003e("all");
    const [searchQuery, setSearchQuery] = useState\u003cstring\u003e("");
    const [activeOnly, setActiveOnly] = useState\u003cboolean\u003e(true);
    const [dialogOpen, setDialogOpen] = useState\u003cboolean\u003e(false);
    const [editingReason, setEditingReason] = useState\u003cPartial\u003cScrapReason\u003e | null\u003e(null);

    // Fetch scrap reasons
    const { data: scrapReasons, isLoading } = useQuery({
        queryKey: ["scrap-reasons", selectedCategory, activeOnly, searchQuery],
        queryFn: async() =\u003e {
            let query = supabase.from("scrap_reasons").select("*");

            if(selectedCategory !== "all") {
                query = query.eq("category", selectedCategory);
}

if (activeOnly) {
    query = query.eq("active", true);
}

if (searchQuery) {
    query = query.or(`code.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
}

const { data, error } = await query.order("code");
if (error) throw error;
return data as ScrapReason[];
    },
  });

// Seed default reasons mutation
const seedDefaultMutation = useMutation({
    mutationFn: async() =\u003e {
    const { data, error } = await supabase.rpc("seed_default_scrap_reasons", {
        p_tenant_id: profile?.tenant_id,
    });
    if(error) throw error;
    return data;
},
    onSuccess: () =\u003e {
    toast.success("Default scrap reasons created successfully");
    queryClient.invalidateQueries({ queryKey: ["scrap-reasons"] });
},
    onError: (error: any) =\u003e {
    toast.error(error.message || "Failed to seed default reasons");
},
  });

// Create/Update mutation
const saveMutation = useMutation({
    mutationFn: async (reason: Partial\u003cScrapReason\u003e) =\u003e {
    if(reason.id) {
        const { data, error } = await supabase
            .from("scrap_reasons")
            .update({
                code: reason.code,
                description: reason.description,
                category: reason.category,
                active: reason.active,
            })
            .eq("id", reason.id)
            .select()
            .single();
if (error) throw error;
return data;
      } else {
    const { data, error } = await supabase
        .from("scrap_reasons")
        .insert({
            tenant_id: profile?.tenant_id,
            code: reason.code,
            description: reason.description,
            category: reason.category,
            active: reason.active ?? true,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}
    },
onSuccess: (_, variables) =\u003e {
    toast.success(variables.id ? "Scrap reason updated" : "Scrap reason created");
    queryClient.invalidateQueries({ queryKey: ["scrap-reasons"] });
    setDialogOpen(false);
    setEditingReason(null);
},
onError: (error: any) =\u003e {
    toast.error(error.message || "Failed to save scrap reason");
},
  });

// Delete mutation
const deleteMutation = useMutation({
    mutationFn: async (id: string) =\u003e {
    const { error } = await supabase.from("scrap_reasons").delete().eq("id", id);
    if(error) throw error;
},
    onSuccess: () =\u003e {
    toast.success("Scrap reason deleted");
    queryClient.invalidateQueries({ queryKey: ["scrap-reasons"] });
},
    onError: (error: any) =\u003e {
    toast.error(error.message || "Failed to delete scrap reason");
},
  });

const handleSave = () =\u003e {
    if (!editingReason?.code || !editingReason?.description || !editingReason?.category) {
    toast.error("Code, description, and category are required");
    return;
}
saveMutation.mutate(editingReason);
  };

const handleDelete = async (reason: ScrapReason) =\u003e {
    if (confirm(`Delete scrap reason "${reason.code}"? This action cannot be undone.`)) {
    deleteMutation.mutate(reason.id);
}
  };

const handleSeedDefaults = () =\u003e {
    if (confirm("This will create 30+ standard scrap reason codes. Continue?")) {
    seedDefaultMutation.mutate();
}
  };

const getCategoryColor = (category: string) =\u003e {
    return categories.find((c) =\u003e c.value === category)?.color || "bg-gray-100 text-gray-800";
  };

return (
\u003cdiv className = "space-y-6"\u003e
\u003cdiv className = "flex justify-between items-center"\u003e
\u003ch1 className = "text-3xl font-bold"\u003eScrap Reasons Configuration\u003c / h1\u003e
\u003cdiv className = "flex gap-2"\u003e
\u003cButton onClick = {() =\u003e { setEditingReason({}); setDialogOpen(true); }}\u003e
\u003cPlus className = "h-4 w-4 mr-2" /\u003e Add Scrap Reason
\u003c / Button\u003e
\u003cButton
variant = "outline"
onClick = { handleSeedDefaults }
disabled = { seedDefaultMutation.isPending }
\u003e
\u003cPackage className = "h-4 w-4 mr-2" /\u003e
{ seedDefaultMutation.isPending ? "Seeding..." : "Seed Default Reasons" }
\u003c / Button\u003e
\u003c / div\u003e
\u003c / div\u003e

{/* Filters */ }
\u003cCard\u003e
\u003cCardContent className = "pt-6"\u003e
\u003cdiv className = "flex gap-4 items-end"\u003e
\u003cdiv className = "flex-1"\u003e
\u003cLabel\u003eSearch\u003c / Label\u003e
\u003cInput
placeholder = "Search by code or description..."
value = { searchQuery }
onChange = {(e) =\u003e setSearchQuery(e.target.value)}
              /\u003e
\u003c / div\u003e
\u003cdiv className = "w-48"\u003e
\u003cLabel\u003eCategory\u003c / Label\u003e
\u003cSelect value = { selectedCategory } onValueChange = { setSelectedCategory }\u003e
\u003cSelectTrigger\u003e
\u003cSelectValue /\u003e
\u003c / SelectTrigger\u003e
\u003cSelectContent\u003e
\u003cSelectItem value = "all"\u003eAll Categories\u003c / SelectItem\u003e
{
    categories.map((cat) =\u003e(
        \u003cSelectItem key = { cat.value } value = { cat.value }\u003e
                      { cat.label }
        \u003c / SelectItem\u003e
    ))
}
\u003c / SelectContent\u003e
\u003c / Select\u003e
\u003c / div\u003e
\u003cdiv className = "flex items-center space-x-2"\u003e
\u003cSwitch id = "active-only" checked = { activeOnly } onCheckedChange = { setActiveOnly } /\u003e
\u003cLabel htmlFor = "active-only"\u003eActive Only\u003c / Label\u003e
\u003c / div\u003e
\u003c / div\u003e
\u003c / CardContent\u003e
\u003c / Card\u003e

{/* Table */ }
\u003cCard\u003e
\u003cCardContent className = "pt-6"\u003e
\u003cTable\u003e
\u003cTableHeader\u003e
\u003cTableRow\u003e
\u003cTableHead\u003eCode\u003c / TableHead\u003e
\u003cTableHead\u003eDescription\u003c / TableHead\u003e
\u003cTableHead\u003eCategory\u003c / TableHead\u003e
\u003cTableHead\u003eStatus\u003c / TableHead\u003e
\u003cTableHead className = "text-right"\u003eActions\u003c / TableHead\u003e
\u003c / TableRow\u003e
\u003c / TableHeader\u003e
\u003cTableBody\u003e
{
    isLoading ? (
    \u003cTableRow\u003e
    \u003cTableCell colSpan = { 5} className = "text-center"\u003e
                    Loading...
    \u003c / TableCell\u003e
    \u003c / TableRow\u003e
              ) : scrapReasons?.length === 0 ? (
    \u003cTableRow\u003e
    \u003cTableCell colSpan = { 5} className = "text-center text-muted-foreground"\u003e
                    No scrap reasons found
    \u003c / TableCell\u003e
    \u003c / TableRow\u003e
              ) : (
        scrapReasons?.map((reason) =\u003e(
            \u003cTableRow key = { reason.id }\u003e
            \u003cTableCell className = "font-medium"\u003e{ reason.code }\u003c / TableCell\u003e
            \u003cTableCell\u003e{ reason.description }\u003c / TableCell\u003e
            \u003cTableCell\u003e
            \u003cBadge className = { getCategoryColor(reason.category)} \u003e
{ categories.find((c) =\u003e c.value === reason.category)?.label }
\u003c / Badge\u003e
\u003c / TableCell\u003e
\u003cTableCell\u003e
\u003cBadge variant = { reason.active ? "default" : "secondary" }\u003e
{ reason.active ? "Active" : "Inactive" }
\u003c / Badge\u003e
\u003c / TableCell\u003e
\u003cTableCell className = "text-right"\u003e
\u003cdiv className = "flex justify-end gap-2"\u003e
\u003cButton
variant = "ghost"
size = "sm"
onClick = {() =\u003e {
    setEditingReason(reason);
    setDialogOpen(true);
}}
\u003e
\u003cEdit2 className = "h-4 w-4" /\u003e
\u003c / Button\u003e
\u003cButton
variant = "ghost"
size = "sm"
onClick = {() =\u003e handleDelete(reason)}
\u003e
\u003cTrash2 className = "h-4 w-4" /\u003e
\u003c / Button\u003e
\u003c / div\u003e
\u003c / TableCell\u003e
\u003c / TableRow\u003e
                ))
              )}
\u003c / TableBody\u003e
\u003c / Table\u003e
\u003c / CardContent\u003e
\u003c / Card\u003e

{/* Add/Edit Dialog */ }
\u003cDialog open = { dialogOpen } onOpenChange = { setDialogOpen }\u003e
\u003cDialogContent\u003e
\u003cDialogHeader\u003e
\u003cDialogTitle\u003e
{ editingReason?.id ? "Edit Scrap Reason" : "Add Scrap Reason" }
\u003c / DialogTitle\u003e
\u003c / DialogHeader\u003e
\u003cdiv className = "space-y-4 py-4"\u003e
\u003cdiv\u003e
\u003cLabel\u003eCode *\u003c / Label\u003e
\u003cInput
value = { editingReason?.code || ""}
onChange = {(e) =\u003e setEditingReason({ ...editingReason, code: e.target.value })}
placeholder = "e.g., PROC-001"
    /\u003e
\u003c / div\u003e
\u003cdiv\u003e
\u003cLabel\u003eDescription *\u003c / Label\u003e
\u003cInput
value = { editingReason?.description || ""}
onChange = {(e) =\u003e
setEditingReason({ ...editingReason, description: e.target.value })
                }
placeholder = "e.g., Bend angle out of tolerance"
    /\u003e
\u003c / div\u003e
\u003cdiv\u003e
\u003cLabel\u003eCategory *\u003c / Label\u003e
\u003cSelect
value = { editingReason?.category }
onValueChange = {(value) =\u003e setEditingReason({ ...editingReason, category: value })}
\u003e
\u003cSelectTrigger\u003e
\u003cSelectValue placeholder = "Select category" /\u003e
\u003c / SelectTrigger\u003e
\u003cSelectContent\u003e
{
    categories.map((cat) =\u003e(
        \u003cSelectItem key = { cat.value } value = { cat.value }\u003e
                      { cat.label }
        \u003c / SelectItem\u003e
    ))
}
\u003c / SelectContent\u003e
\u003c / Select\u003e
\u003c / div\u003e
\u003cdiv className = "flex items-center space-x-2"\u003e
\u003cSwitch
id = "edit-active"
checked = { editingReason?.active ?? true}
onCheckedChange = {(checked) =\u003e setEditingReason({ ...editingReason, active: checked })}
              /\u003e
\u003cLabel htmlFor = "edit-active"\u003eActive\u003c / Label\u003e
\u003c / div\u003e
\u003c / div\u003e
\u003cdiv className = "flex justify-end gap-2"\u003e
\u003cButton variant = "outline" onClick = {() =\u003e setDialogOpen(false)}\u003e
Cancel
\u003c / Button\u003e
\u003cButton onClick = { handleSave } disabled = { saveMutation.isPending }\u003e
{ saveMutation.isPending ? "Saving..." : "Save" }
\u003c / Button\u003e
\u003c / div\u003e
\u003c / DialogContent\u003e
\u003c / Dialog\u003e
\u003c / div\u003e
  );
}
