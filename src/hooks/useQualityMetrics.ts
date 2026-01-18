import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QualityMetrics {
  // Production totals
  totalProduced: number;
  totalGood: number;
  totalScrap: number;
  totalRework: number;

  // Yield metrics
  overallYield: number;
  scrapRate: number;
  reworkRate: number;

  // Scrap by category
  scrapByCategory: {
    category: string;
    count: number;
    quantity: number;
  }[];

  // Scrap by reason (top reasons)
  topScrapReasons: {
    code: string;
    description: string;
    category: string;
    count: number;
    quantity: number;
  }[];

  // Issue metrics
  issueMetrics: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    closed: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface ScrapReasonUsage {
  id: string;
  code: string;
  description: string;
  category: string;
  active: boolean;
  usageCount: number;
  totalScrapQuantity: number;
  lastUsed: string | null;
}

// Hook to fetch overall quality metrics for the tenant
export function useQualityMetrics() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["quality-metrics", profile?.tenant_id],
    queryFn: async (): Promise<QualityMetrics> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      // Fetch production quantities
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          scrap_reason_id,
          scrap_reason:scrap_reasons(code, description, category)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (quantitiesError) throw quantitiesError;

      // Fetch issues
      const { data: issues, error: issuesError } = await supabase
        .from("issues")
        .select("id, status, severity")
        .eq("tenant_id", profile.tenant_id);

      if (issuesError) throw issuesError;

      // Calculate production totals in single pass instead of 4 separate reduces
      const totals = quantities?.reduce(
        (acc, q) => ({
          produced: acc.produced + (q.quantity_produced || 0),
          good: acc.good + (q.quantity_good || 0),
          scrap: acc.scrap + (q.quantity_scrap || 0),
          rework: acc.rework + (q.quantity_rework || 0),
        }),
        { produced: 0, good: 0, scrap: 0, rework: 0 }
      ) || { produced: 0, good: 0, scrap: 0, rework: 0 };
      const { produced: totalProduced, good: totalGood, scrap: totalScrap, rework: totalRework } = totals;

      // Calculate yield metrics
      const overallYield = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;
      const scrapRate = totalProduced > 0 ? (totalScrap / totalProduced) * 100 : 0;
      const reworkRate = totalProduced > 0 ? (totalRework / totalProduced) * 100 : 0;

      // Group scrap by category
      const categoryMap = new Map<string, { count: number; quantity: number }>();
      quantities?.forEach((q) => {
        if (q.quantity_scrap > 0 && q.scrap_reason) {
          const reason = q.scrap_reason as { category: string };
          const existing = categoryMap.get(reason.category) || { count: 0, quantity: 0 };
          categoryMap.set(reason.category, {
            count: existing.count + 1,
            quantity: existing.quantity + q.quantity_scrap,
          });
        }
      });
      const scrapByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        ...data,
      })).sort((a, b) => b.quantity - a.quantity);

      // Group scrap by reason
      const reasonMap = new Map<string, { code: string; description: string; category: string; count: number; quantity: number }>();
      quantities?.forEach((q) => {
        if (q.quantity_scrap > 0 && q.scrap_reason_id && q.scrap_reason) {
          const reason = q.scrap_reason as { code: string; description: string; category: string };
          const existing = reasonMap.get(q.scrap_reason_id) || {
            code: reason.code,
            description: reason.description,
            category: reason.category,
            count: 0,
            quantity: 0,
          };
          reasonMap.set(q.scrap_reason_id, {
            ...existing,
            count: existing.count + 1,
            quantity: existing.quantity + q.quantity_scrap,
          });
        }
      });
      const topScrapReasons = Array.from(reasonMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Calculate issue metrics in single pass instead of 9 separate filters
      const issueCounts = issues?.reduce(
        (acc, i) => {
          // Count by status
          if (i.status === "pending") acc.pending++;
          else if (i.status === "approved") acc.approved++;
          else if (i.status === "rejected") acc.rejected++;
          else if (i.status === "closed") acc.closed++;
          // Count by severity
          if (i.severity === "critical") acc.critical++;
          else if (i.severity === "high") acc.high++;
          else if (i.severity === "medium") acc.medium++;
          else if (i.severity === "low") acc.low++;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0 }
      ) || { pending: 0, approved: 0, rejected: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0 };

      const issueMetrics = {
        total: issues?.length || 0,
        pending: issueCounts.pending,
        approved: issueCounts.approved,
        rejected: issueCounts.rejected,
        closed: issueCounts.closed,
        bySeverity: {
          critical: issueCounts.critical,
          high: issueCounts.high,
          medium: issueCounts.medium,
          low: issueCounts.low,
        },
      };

      return {
        totalProduced,
        totalGood,
        totalScrap,
        totalRework,
        overallYield,
        scrapRate,
        reworkRate,
        scrapByCategory,
        topScrapReasons,
        issueMetrics,
      };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to fetch scrap reason usage statistics
export function useScrapReasonUsage() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["scrap-reason-usage", profile?.tenant_id],
    queryFn: async (): Promise<ScrapReasonUsage[]> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      // Fetch all scrap reasons - only fields we need
      const { data: reasons, error: reasonsError } = await supabase
        .from("scrap_reasons")
        .select("id, code, description, category, active")
        .eq("tenant_id", profile.tenant_id)
        .order("code");

      if (reasonsError) throw reasonsError;

      // Fetch usage counts
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select("scrap_reason_id, quantity_scrap, recorded_at")
        .eq("tenant_id", profile.tenant_id)
        .not("scrap_reason_id", "is", null);

      if (quantitiesError) throw quantitiesError;

      // Build usage map
      const usageMap = new Map<string, { count: number; totalQuantity: number; lastUsed: string | null }>();
      quantities?.forEach((q) => {
        if (q.scrap_reason_id) {
          const existing = usageMap.get(q.scrap_reason_id) || { count: 0, totalQuantity: 0, lastUsed: null };
          usageMap.set(q.scrap_reason_id, {
            count: existing.count + 1,
            totalQuantity: existing.totalQuantity + (q.quantity_scrap || 0),
            lastUsed: !existing.lastUsed || q.recorded_at > existing.lastUsed ? q.recorded_at : existing.lastUsed,
          });
        }
      });

      // Merge with reasons
      return (reasons || []).map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        category: r.category,
        active: r.active,
        usageCount: usageMap.get(r.id)?.count || 0,
        totalScrapQuantity: usageMap.get(r.id)?.totalQuantity || 0,
        lastUsed: usageMap.get(r.id)?.lastUsed || null,
      }));
    },
    enabled: !!profile?.tenant_id,
    staleTime: 30000,
  });
}

// Hook to fetch quality metrics for a specific job
// Optimized: Uses single query with joins instead of 3 sequential queries
export function useJobQualityMetrics(jobId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["job-quality-metrics", jobId, profile?.tenant_id],
    queryFn: async () => {
      if (!jobId || !profile?.tenant_id) {
        return null;
      }

      // Single query with joins - replaces 3 sequential queries for quantities
      // Includes explicit tenant_id filter for defense-in-depth security
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          operation:operations!inner (
            id,
            part:parts!inner (
              job_id
            )
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("operation.part.job_id", jobId);

      if (quantitiesError) throw quantitiesError;

      // Collect unique operation IDs for issue query
      const operationIds = new Set<string>();
      quantities?.forEach((q) => {
        const op = q.operation as { id: string } | null;
        if (op?.id) operationIds.add(op.id);
      });

      // Get issues for these operations (only if we have operations)
      // Includes explicit tenant_id filter for defense-in-depth security
      let issues: { id: string; status: string; severity: string }[] = [];
      if (operationIds.size > 0) {
        const { data: issuesData, error: issuesError } = await supabase
          .from("issues")
          .select("id, status, severity")
          .eq("tenant_id", profile.tenant_id)
          .in("operation_id", Array.from(operationIds));

        if (issuesError) throw issuesError;
        issues = issuesData || [];
      }

      // Single pass to calculate all totals
      const totals = quantities?.reduce(
        (acc, q) => ({
          produced: acc.produced + (q.quantity_produced || 0),
          good: acc.good + (q.quantity_good || 0),
          scrap: acc.scrap + (q.quantity_scrap || 0),
          rework: acc.rework + (q.quantity_rework || 0),
        }),
        { produced: 0, good: 0, scrap: 0, rework: 0 }
      ) || { produced: 0, good: 0, scrap: 0, rework: 0 };

      const { produced: totalProduced, good: totalGood, scrap: totalScrap, rework: totalRework } = totals;
      const yieldRate = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;

      // Single pass for issue counts
      const issueCounts = issues.reduce(
        (acc, i) => ({
          pending: acc.pending + (i.status === "pending" ? 1 : 0),
          critical: acc.critical + (i.severity === "critical" ? 1 : 0),
        }),
        { pending: 0, critical: 0 }
      );

      return {
        totalProduced,
        totalGood,
        totalScrap,
        totalRework,
        yieldRate,
        issueCount: issues.length,
        pendingIssues: issueCounts.pending,
        criticalIssues: issueCounts.critical,
      };
    },
    enabled: !!jobId && !!profile?.tenant_id,
    staleTime: 30000,
  });
}

// Hook to fetch quality metrics for a specific part
// Optimized: Uses single-pass reduce for totals and issue counts
export function usePartQualityMetrics(partId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["part-quality-metrics", partId, profile?.tenant_id],
    queryFn: async () => {
      if (!partId || !profile?.tenant_id) {
        return null;
      }

      // Get all operation IDs for this part
      // Includes explicit tenant_id filter for defense-in-depth security
      const { data: operations, error: opsError } = await supabase
        .from("operations")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("part_id", partId);

      if (opsError) throw opsError;
      if (!operations || operations.length === 0) return null;

      const operationIds = operations.map((o) => o.id);

      // Get production quantities for these operations
      // Includes explicit tenant_id filter for defense-in-depth security
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          scrap_reason:scrap_reasons(code, description)
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("operation_id", operationIds);

      if (quantitiesError) throw quantitiesError;

      // Get issues for these operations
      // Includes explicit tenant_id filter for defense-in-depth security
      const { data: issues, error: issuesError } = await supabase
        .from("issues")
        .select("id, status, severity")
        .eq("tenant_id", profile.tenant_id)
        .in("operation_id", operationIds);

      if (issuesError) throw issuesError;

      // Single pass to calculate all totals
      const totals = quantities?.reduce(
        (acc, q) => ({
          produced: acc.produced + (q.quantity_produced || 0),
          good: acc.good + (q.quantity_good || 0),
          scrap: acc.scrap + (q.quantity_scrap || 0),
          rework: acc.rework + (q.quantity_rework || 0),
        }),
        { produced: 0, good: 0, scrap: 0, rework: 0 }
      ) || { produced: 0, good: 0, scrap: 0, rework: 0 };

      const { produced: totalProduced, good: totalGood, scrap: totalScrap, rework: totalRework } = totals;
      const yieldRate = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;

      // Single pass for issue counts
      const issueCounts = issues?.reduce(
        (acc, i) => ({
          pending: acc.pending + (i.status === "pending" ? 1 : 0),
          critical: acc.critical + (i.severity === "critical" ? 1 : 0),
        }),
        { pending: 0, critical: 0 }
      ) || { pending: 0, critical: 0 };

      return {
        totalProduced,
        totalGood,
        totalScrap,
        totalRework,
        yieldRate,
        issueCount: issues?.length || 0,
        pendingIssues: issueCounts.pending,
        criticalIssues: issueCounts.critical,
        hasQualityData: (quantities?.length || 0) > 0,
      };
    },
    enabled: !!partId && !!profile?.tenant_id,
    staleTime: 30000,
  });
}
