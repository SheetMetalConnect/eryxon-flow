import { useAuth } from "@/contexts/AuthContext";
import { useAllCellsQRMMetrics } from "@/hooks/useQRMMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Operation {
  id: string;
  operation_name: string;
  status: string;
  estimated_time: number;
  actual_time: number | null;
  cell_id: string;
  part: {
    id: string;
    part_number: string;
    material: string;
    quantity: number;
    job: {
      job_number: string;
      due_date: string | null;
    };
  };
}

/**
 * QRM Dashboard - Shows WIP metrics and operations by cell
 */
export function QRMDashboard() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cellsMetrics, loading } = useAllCellsQRMMetrics(profile?.tenant_id || null);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  // Fetch cell details and operations
  const { data: cells } = useQuery({
    queryKey: ["cells", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("cells")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("active", true)
        .order("sequence");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: operations = [] } = useQuery({
    queryKey: ["operations-by-cell", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("operations")
        .select(`
          id,
          operation_name,
          status,
          estimated_time,
          actual_time,
          cell_id,
          part:parts!inner(
            id,
            part_number,
            material,
            quantity,
            job:jobs!inner(
              job_number,
              due_date
            )
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["not_started", "in_progress"])
        .order("part(job(due_date))", { ascending: true });
      if (error) throw error;
      return data as unknown as Operation[];
    },
    enabled: !!profile?.tenant_id,
  });

  const toggleCell = (cellId: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        next.add(cellId);
      }
      return next;
    });
  };

  const getOperationsForCell = (cellId: string) => {
    return operations.filter((op) => op.cell_id === cellId);
  };

  const groupOperations = (ops: Operation[]) => {
    return {
      active: ops.filter((op) => op.status === "in_progress"),
      buffer: ops.filter((op) => op.status === "not_started").slice(0, 5),
      expected: ops.filter((op) => op.status === "not_started").slice(5),
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!cells || cells.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("qrm.dashboard", "QRM Dashboard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("qrm.noCells", "No cells configured yet.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalWIP = Object.values(cellsMetrics).reduce((sum, m) => sum + (m?.current_wip ?? 0), 0);
  const atCapacity = Object.values(cellsMetrics).filter((m) => m?.status === "at_capacity").length;
  const nearCapacity = Object.values(cellsMetrics).filter((m) => m?.status === "warning").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("qrm.dashboard", "QRM Dashboard")}</CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("qrm.totalWIP", "Total WIP")}:</span>
              <span className="font-bold">{totalWIP}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("qrm.atCapacity", "At Capacity")}:</span>
              <span className="font-bold text-destructive">{atCapacity}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("qrm.nearCapacity", "Near Capacity")}:</span>
              <span className="font-bold text-amber-600">{nearCapacity}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {cells.map((cell) => {
          const metrics = cellsMetrics[cell.id];
          const cellOps = getOperationsForCell(cell.id);
          const grouped = groupOperations(cellOps);
          const isExpanded = expandedCells.has(cell.id);
          const wipPercent = metrics?.wip_limit ? (metrics.current_wip / metrics.wip_limit) * 100 : 0;

          return (
            <div key={cell.id} className="border border-border rounded-lg overflow-hidden">
              {/* Cell Header */}
              <div
                className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCell(cell.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: cell.color || "hsl(var(--muted))" }}
                  />
                  <span className="font-semibold">{cell.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">WIP:</span>
                    <span className="font-bold">{metrics?.current_wip || 0}</span>
                    {metrics?.wip_limit && (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <span>{metrics.wip_limit}</span>
                        <span className="text-muted-foreground">({wipPercent.toFixed(0)}%)</span>
                      </>
                    )}
                  </div>
                  {metrics?.status === "at_capacity" && (
                    <Badge variant="destructive" className="text-xs">{t("qrm.atCapacity", "At Capacity")}</Badge>
                  )}
                  {metrics?.status === "warning" && (
                    <Badge className="bg-amber-500 text-xs">{t("qrm.warning", "Warning")}</Badge>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-3 space-y-3 bg-card">
                  {/* Active */}
                  {grouped.active.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-2">
                        <div className="h-0.5 w-2 bg-emerald-500 rounded" />
                        {t("qrm.active", "Active")} ({grouped.active.length})
                      </div>
                      <div className="space-y-1">
                        {grouped.active.map((op) => (
                          <div
                            key={op.id}
                            className="flex items-center justify-between text-xs p-2 bg-emerald-950/5 rounded hover:bg-emerald-950/10 cursor-pointer transition-colors"
                            onClick={() => navigate(`/admin/operations`)}
                          >
                            <span className="font-medium">{op.part.job.job_number}</span>
                            <span className="text-muted-foreground">{op.part.part_number}</span>
                            <Badge variant="secondary" className="text-xs">{op.operation_name}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buffer */}
                  {grouped.buffer.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-blue-600 mb-1.5 flex items-center gap-2">
                        <div className="h-0.5 w-2 bg-blue-500 rounded" />
                        {t("qrm.buffer", "Buffer")} ({grouped.buffer.length})
                      </div>
                      <div className="space-y-1">
                        {grouped.buffer.map((op) => (
                          <div
                            key={op.id}
                            className="flex items-center justify-between text-xs p-2 bg-blue-950/5 rounded hover:bg-blue-950/10 cursor-pointer transition-colors"
                            onClick={() => navigate(`/admin/operations`)}
                          >
                            <span className="font-medium">{op.part.job.job_number}</span>
                            <span className="text-muted-foreground">{op.part.part_number}</span>
                            <Badge variant="outline" className="text-xs">{op.operation_name}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expected */}
                  {grouped.expected.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-2">
                        <div className="h-0.5 w-2 bg-muted rounded" />
                        {t("qrm.expected", "Expected")} ({grouped.expected.length})
                      </div>
                      <div className="space-y-1">
                        {grouped.expected.slice(0, 3).map((op) => (
                          <div
                            key={op.id}
                            className="flex items-center justify-between text-xs p-2 bg-muted/20 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(`/admin/operations`)}
                          >
                            <span className="font-medium">{op.part.job.job_number}</span>
                            <span className="text-muted-foreground">{op.part.part_number}</span>
                            <Badge variant="outline" className="text-xs">{op.operation_name}</Badge>
                          </div>
                        ))}
                        {grouped.expected.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center p-1">
                            +{grouped.expected.length - 3} {t("qrm.more", "more")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {cellOps.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      {t("qrm.noOperations", "No operations in this cell")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
