import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Issue {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  description: string;
  created_at: string;
}

export function useOperationIssues(operationId: string, tenantId: string | undefined) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !operationId) {
      setLoading(false);
      return;
    }

    loadIssues();
    
    const channel = supabase
      .channel(`operation-issues-${operationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
          filter: `operation_id=eq.${operationId}`,
        },
        () => {
          loadIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId, tenantId]);

  const loadIssues = async () => {
    if (!tenantId || !operationId) return;

    const { data } = await supabase
      .from("issues")
      .select("id, severity, status, description, created_at")
      .eq("operation_id", operationId)
      .eq("tenant_id", tenantId);

    setIssues(data || []);
    setLoading(false);
  };

  const pendingIssues = issues.filter(i => i.status === "pending");
  const highestSeverity = pendingIssues.length > 0
    ? pendingIssues.reduce((highest, issue) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[issue.severity] > severityOrder[highest]
          ? issue.severity
          : highest;
      }, "low" as "low" | "medium" | "high" | "critical")
    : null;

  return {
    issues,
    pendingIssues,
    pendingCount: pendingIssues.length,
    highestSeverity,
    loading,
  };
}
