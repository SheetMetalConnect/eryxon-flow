import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Issue {
  id: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  image_paths: string[] | null;
  operation: {
    operation_name: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
      };
    };
  };
  creator: {
    full_name: string;
  };
}

export default function IssueQueue() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadIssues();
      setupRealtime();
    }
  }, [profile?.tenant_id]);

  const loadIssues = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("issues")
      .select(`
        *,
        operation:operations!inner(
          operation_name,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          )
        ),
        creator:profiles!issues_created_by_fkey(full_name)
      `)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "pending")
      .order("severity", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading issues:", error);
    } else {
      setIssues(data || []);
    }
    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("issue-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
          filter: `tenant_id=eq.${profile?.tenant_id}`,
        },
        () => loadIssues()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReview = async (action: "approved" | "rejected" | "closed") => {
    if (!selectedIssue || !profile?.id || !resolutionNotes.trim()) {
      toast.error("Please provide resolution notes");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          status: action,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim(),
        })
        .eq("id", selectedIssue.id);

      if (error) throw error;

      toast.success(`Issue ${action}`);
      setSelectedIssue(null);
      setResolutionNotes("");
      loadIssues();
    } catch (error: any) {
      toast.error(error.message || "Failed to update issue");
    } finally {
      setActionLoading(false);
    }
  };

  const severityColors = {
    low: "bg-gray-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Issue Review Queue</h1>
          <p className="text-muted-foreground">
            {issues.length} pending issue{issues.length !== 1 ? "s" : ""}
          </p>
        </div>

        {issues.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">No pending issues</h3>
            <p className="text-sm text-muted-foreground">All issues have been reviewed</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {issues.map((issue) => (
              <Card
                key={issue.id}
                className="p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => {
                  setSelectedIssue(issue);
                  setResolutionNotes("");
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={severityColors[issue.severity as keyof typeof severityColors]}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <div className="font-medium mb-1">
                      {issue.operation.part.job.job_number} • {issue.operation.part.part_number} • {issue.operation.operation_name}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {issue.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Reported by {issue.creator.full_name} on {format(new Date(issue.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Button size="sm">Review</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Issue</DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={severityColors[selectedIssue.severity as keyof typeof severityColors]}>
                  {selectedIssue.severity}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Operation</div>
                <div className="font-medium">
                  {selectedIssue.operation.part.job.job_number} • {selectedIssue.operation.part.part_number} •{" "}
                  {selectedIssue.operation.operation_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <div className="text-sm p-3 bg-muted rounded">{selectedIssue.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Reported By</div>
                  <div className="text-sm">{selectedIssue.creator.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Created</div>
                  <div className="text-sm">{format(new Date(selectedIssue.created_at), "PPp")}</div>
                </div>
              </div>

              {selectedIssue.image_paths && selectedIssue.image_paths.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Attached Photos</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIssue.image_paths.map((path, index) => (
                      <img
                        key={index}
                        src={supabase.storage.from("issues").getPublicUrl(path).data.publicUrl}
                        alt={`Issue photo ${index + 1}`}
                        className="rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="resolution">Resolution Notes *</Label>
                <Textarea
                  id="resolution"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter resolution notes..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleReview("approved")}
                  disabled={actionLoading || !resolutionNotes.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleReview("rejected")}
                  disabled={actionLoading || !resolutionNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
