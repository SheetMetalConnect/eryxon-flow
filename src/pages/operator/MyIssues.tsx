import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";

interface Issue {
  id: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
  image_paths: string[] | null;
  task: {
    task_name: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
      };
    };
  };
}

export default function MyIssues() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadIssues();
      setupRealtime();
    }
  }, [profile?.id]);

  const loadIssues = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from("issues")
      .select(`
        *,
        task:tasks!inner(
          task_name,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          )
        )
      `)
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading issues:", error);
    } else {
      setIssues(data || []);
    }
    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("my-issues")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
          filter: `created_by=eq.${profile?.id}`,
        },
        () => loadIssues()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const severityColors = {
    low: "bg-gray-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  const statusColors = {
    pending: "bg-blue-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    closed: "bg-gray-500",
  };

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
          <h1 className="text-3xl font-bold">My Issues</h1>
          <p className="text-muted-foreground">Issues you've reported</p>
        </div>

        {issues.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No issues reported</h3>
            <p className="text-sm text-muted-foreground">
              You haven't reported any issues yet
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {issues.map((issue) => (
              <Card
                key={issue.id}
                className="p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={severityColors[issue.severity as keyof typeof severityColors]}>
                        {issue.severity}
                      </Badge>
                      <Badge variant="outline" className={statusColors[issue.status as keyof typeof statusColors]}>
                        {issue.status}
                      </Badge>
                    </div>
                    <div className="font-medium mb-1">
                      {issue.task.part.job.job_number} • {issue.task.part.part_number} • {issue.task.task_name}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground shrink-0">
                    {format(new Date(issue.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Issue Detail Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={severityColors[selectedIssue.severity as keyof typeof severityColors]}>
                  {selectedIssue.severity}
                </Badge>
                <Badge variant="outline" className={statusColors[selectedIssue.status as keyof typeof statusColors]}>
                  {selectedIssue.status}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Task</div>
                <div className="font-medium">
                  {selectedIssue.task.part.job.job_number} • {selectedIssue.task.part.part_number} •{" "}
                  {selectedIssue.task.task_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <div className="text-sm p-3 bg-muted rounded">{selectedIssue.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Created</div>
                  <div className="text-sm">{format(new Date(selectedIssue.created_at), "PPp")}</div>
                </div>
                {selectedIssue.reviewed_at && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Reviewed</div>
                    <div className="text-sm">{format(new Date(selectedIssue.reviewed_at), "PPp")}</div>
                  </div>
                )}
              </div>

              {selectedIssue.resolution_notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Resolution Notes</div>
                  <div className="text-sm p-3 bg-muted rounded">{selectedIssue.resolution_notes}</div>
                </div>
              )}

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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
