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

      // Calculate production totals
      const totalProduced = quantities?.reduce((sum, q) => sum + (q.quantity_produced || 0), 0) || 0;
      const totalGood = quantities?.reduce((sum, q) => sum + (q.quantity_good || 0), 0) || 0;
      const totalScrap = quantities?.reduce((sum, q) => sum + (q.quantity_scrap || 0), 0) || 0;
      const totalRework = quantities?.reduce((sum, q) => sum + (q.quantity_rework || 0), 0) || 0;

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

      // Calculate issue metrics
      const issueMetrics = {
        total: issues?.length || 0,
        pending: issues?.filter((i) => i.status === "pending").length || 0,
        approved: issues?.filter((i) => i.status === "approved").length || 0,
        rejected: issues?.filter((i) => i.status === "rejected").length || 0,
        closed: issues?.filter((i) => i.status === "closed").length || 0,
        bySeverity: {
          critical: issues?.filter((i) => i.severity === "critical").length || 0,
          high: issues?.filter((i) => i.severity === "high").length || 0,
          medium: issues?.filter((i) => i.severity === "medium").length || 0,
          low: issues?.filter((i) => i.severity === "low").length || 0,
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

      // Fetch all scrap reasons
      const { data: reasons, error: reasonsError } = await supabase
        .from("scrap_reasons")
        .select("*")
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
export function useJobQualityMetrics(jobId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["job-quality-metrics", jobId],
    queryFn: async () => {
      if (!jobId || !profile?.tenant_id) {
        return null;
      }

      // Get all operations for this job's parts
      const { data: parts, error: partsError } = await supabase
        .from("parts")
        .select("id")
        .eq("job_id", jobId);

      if (partsError) throw partsError;
      if (!parts || parts.length === 0) return null;

      const partIds = parts.map((p) => p.id);

      // Get all operation IDs for these parts
      const { data: operations, error: opsError } = await supabase
        .from("operations")
        .select("id")
        .in("part_id", partIds);

      if (opsError) throw opsError;
      if (!operations || operations.length === 0) return null;

      const operationIds = operations.map((o) => o.id);

      // Get production quantities for these operations
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework
        `)
        .in("operation_id", operationIds);

      if (quantitiesError) throw quantitiesError;

      // Get issues for these operations
      const { data: issues, error: issuesError } = await supabase
        .from("issues")
        .select("id, status, severity")
        .in("operation_id", operationIds);

      if (issuesError) throw issuesError;

      // Calculate metrics
      const totalProduced = quantities?.reduce((sum, q) => sum + (q.quantity_produced || 0), 0) || 0;
      const totalGood = quantities?.reduce((sum, q) => sum + (q.quantity_good || 0), 0) || 0;
      const totalScrap = quantities?.reduce((sum, q) => sum + (q.quantity_scrap || 0), 0) || 0;
      const totalRework = quantities?.reduce((sum, q) => sum + (q.quantity_rework || 0), 0) || 0;
      const yieldRate = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;

      return {
        totalProduced,
        totalGood,
        totalScrap,
        totalRework,
        yieldRate,
        issueCount: issues?.length || 0,
        pendingIssues: issues?.filter((i) => i.status === "pending").length || 0,
        criticalIssues: issues?.filter((i) => i.severity === "critical").length || 0,
      };
    },
    enabled: !!jobId && !!profile?.tenant_id,
    staleTime: 30000,
  });
}

// Hook to fetch quality metrics for a specific part
export function usePartQualityMetrics(partId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["part-quality-metrics", partId],
    queryFn: async () => {
      if (!partId || !profile?.tenant_id) {
        return null;
      }

      // Get all operation IDs for this part
      const { data: operations, error: opsError } = await supabase
        .from("operations")
        .select("id")
        .eq("part_id", partId);

      if (opsError) throw opsError;
      if (!operations || operations.length === 0) return null;

      const operationIds = operations.map((o) => o.id);

      // Get production quantities for these operations
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          scrap_reason:scrap_reasons(code, description)
        `)
        .in("operation_id", operationIds);

      if (quantitiesError) throw quantitiesError;

      // Get issues for these operations
      const { data: issues, error: issuesError } = await supabase
        .from("issues")
        .select("id, status, severity")
        .in("operation_id", operationIds);

      if (issuesError) throw issuesError;

      // Calculate metrics
      const totalProduced = quantities?.reduce((sum, q) => sum + (q.quantity_produced || 0), 0) || 0;
      const totalGood = quantities?.reduce((sum, q) => sum + (q.quantity_good || 0), 0) || 0;
      const totalScrap = quantities?.reduce((sum, q) => sum + (q.quantity_scrap || 0), 0) || 0;
      const totalRework = quantities?.reduce((sum, q) => sum + (q.quantity_rework || 0), 0) || 0;
      const yieldRate = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;

      return {
        totalProduced,
        totalGood,
        totalScrap,
        totalRework,
        yieldRate,
        issueCount: issues?.length || 0,
        pendingIssues: issues?.filter((i) => i.status === "pending").length || 0,
        criticalIssues: issues?.filter((i) => i.severity === "critical").length || 0,
        hasQualityData: (quantities?.length || 0) > 0,
      };
    },
    enabled: !!partId && !!profile?.tenant_id,
    staleTime: 30000,
  });
}
