import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface IssueFormProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function IssueForm({ taskId, open, onOpenChange, onSuccess }: IssueFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !profile?.tenant_id || !description.trim()) return;

    setLoading(true);
    try {
      const issueId = crypto.randomUUID();
      const imagePaths: string[] = [];

      // Upload images if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const path = `${profile.tenant_id}/issues/${issueId}/${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("issues")
            .upload(path, file);

          if (uploadError) throw uploadError;
          imagePaths.push(path);
        }
      }

      // Create issue
      const { error } = await supabase.from("issues").insert({
        id: issueId,
        tenant_id: profile.tenant_id,
        task_id: taskId,
        created_by: profile.id,
        description: description.trim(),
        severity,
        image_paths: imagePaths.length > 0 ? imagePaths : null,
      });

      if (error) throw error;

      toast.success("Issue reported successfully");
      setDescription("");
      setSeverity("medium");
      setFiles(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to report issue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={5}
              required
            />
          </div>

          <div>
            <Label htmlFor="photos">Photos (optional)</Label>
            <div className="mt-2">
              <label
                htmlFor="photos"
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {files && files.length > 0
                    ? `${files.length} file(s) selected`
                    : "Choose photos"}
                </span>
              </label>
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !description.trim()} className="flex-1">
              Report Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
