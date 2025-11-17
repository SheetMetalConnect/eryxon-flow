import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    "approved" | "closed" | "pending" | "rejected" | "all"
  >("pending");
  const [severityFilter, setSeverityFilter] = useState<
    "critical" | "high" | "low" | "medium" | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (profile?.tenant_id) {
      loadIssues();
      setupRealtime();
    }
  }, [profile?.tenant_id, statusFilter, severityFilter, searchQuery]);

  const loadIssues = async () => {
    if (!profile?.tenant_id) return;

    let query = supabase
      .from("issues")
      .select(
        `
        *,
        operation:operations!inner(
          operation_name,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          )
        ),
        creator:profiles!issues_created_by_fkey(full_name)
      `,
      )
      .eq("tenant_id", profile.tenant_id);

    // Apply status filter
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    // Apply severity filter
    if (severityFilter !== "all") {
      query = query.eq("severity", severityFilter);
    }

    // Apply search query (job number, part number, or operation name)
    if (searchQuery) {
      query = query.or(
        `operation.part.job.job_number.ilike.%${searchQuery}%,operation.part.part_number.ilike.%${searchQuery}%,operation.operation_name.ilike.%${searchQuery}%`,
      );
    }

    query = query
      .order("severity", { ascending: false })
      .order("created_at", { ascending: true });

    const { data, error } = await query;

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
        () => loadIssues(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReview = async (action: "approved" | "rejected" | "closed") => {
    if (!selectedIssue || !profile?.id || !resolutionNotes.trim()) {
      toast.error(t("issues.pleaseProvideResolutionNotes"));
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

      toast.success(
        t(`issues.issue${action.charAt(0).toUpperCase() + action.slice(1)}`),
      );
      setSelectedIssue(null);
      setResolutionNotes("");
      loadIssues();
    } catch (error: any) {
      toast.error(error.message || t("issues.failedToUpdateIssue"));
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{t("issues.issueQueue")}</h1>
        <p className="text-muted-foreground">
          {issues.length} {t("issues.pendingIssue", { count: issues.length })}
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="search" className="mb-2 block">
            Search (Job/Part/Operation)
          </Label>
          <Input
            id="search"
            placeholder="Search by job, part, or operation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="status-filter" className="mb-2 block">
            Status
          </Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="severity-filter" className="mb-2 block">
            Severity
          </Label>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
            <SelectTrigger id="severity-filter">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {issues.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium mb-2">
            {t("issues.noPendingIssues")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("issues.allIssuesReviewed")}
          </p>
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
                    <Badge
                      className={
                        severityColors[
                          issue.severity as keyof typeof severityColors
                        ]
                      }
                    >
                      {t(`issues.severity.${issue.severity}`)}
                    </Badge>
                  </div>
                  <div className="font-medium mb-1">
                    {issue.operation.part.job.job_number} •{" "}
                    {issue.operation.part.part_number} •{" "}
                    {issue.operation.operation_name}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {issue.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {t("issues.reportedBy", {
                      name: issue.creator.full_name,
                      date: format(new Date(issue.created_at), "MMM d, yyyy"),
                    })}
                  </div>
                </div>
                <Button size="sm">{t("issues.review")}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog
        open={!!selectedIssue}
        onOpenChange={() => setSelectedIssue(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("issues.reviewIssue")}</DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    severityColors[
                      selectedIssue.severity as keyof typeof severityColors
                    ]
                  }
                >
                  {t(`issues.severity.${selectedIssue.severity}`)}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {t("issues.operation")}
                </div>
                <div className="font-medium">
                  {selectedIssue.operation.part.job.job_number} •{" "}
                  {selectedIssue.operation.part.part_number} •{" "}
                  {selectedIssue.operation.operation_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {t("issues.description")}
                </div>
                <div className="text-sm p-3 bg-muted rounded">
                  {selectedIssue.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {t("issues.reportedBy")}
                  </div>
                  <div className="text-sm">
                    {selectedIssue.creator.full_name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {t("issues.created")}
                  </div>
                  <div className="text-sm">
                    {format(new Date(selectedIssue.created_at), "PPp")}
                  </div>
                </div>
              </div>

              {selectedIssue.image_paths &&
                selectedIssue.image_paths.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {t("issues.attachedPhotos")}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedIssue.image_paths.map((path, index) => (
                        <img
                          key={index}
                          src={
                            supabase.storage.from("issues").getPublicUrl(path)
                              .data.publicUrl
                          }
                          alt={t("issues.issuePhoto", { number: index + 1 })}
                          className="rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <Label htmlFor="resolution">
                  {t("issues.resolutionNotes")} *
                </Label>
                <Textarea
                  id="resolution"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={t("issues.enterResolutionNotes")}
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
                  {t("issues.approve")}
                </Button>
                <Button
                  onClick={() => handleReview("rejected")}
                  disabled={actionLoading || !resolutionNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("issues.reject")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
