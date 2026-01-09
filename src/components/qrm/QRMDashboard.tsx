import { useAuth } from "@/contexts/AuthContext";
import { useAllCellsQRMMetrics } from "@/hooks/useQRMMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

// Unified section header matching Dashboard
function SectionHeader({ 
  title, 
  subtitle,
  stats
}: { 
  title: string;
  subtitle?: string;
  stats?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {stats}
    </div>
  );
}

export function QRMDashboard() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cellsMetrics, loading } = useAllCellsQRMMetrics(profile?.tenant_id || null);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

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
          parts!inner(
            id,
            part_number,
            material,
            quantity,
            jobs!inner(
              job_number,
              due_date
            )
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["not_started", "in_progress"]);
      
      if (error) throw error;
      
      return (data || []).map((op: any) => ({
        id: op.id,
        operation_name: op.operation_name,
        status: op.status,
        estimated_time: op.estimated_time,
        actual_time: op.actual_time,
        cell_id: op.cell_id,
        part: {
          id: op.parts.id,
          part_number: op.parts.part_number,
          material: op.parts.material,
          quantity: op.parts.quantity,
          job: {
            job_number: op.parts.jobs.job_number,
            due_date: op.parts.jobs.due_date,
          },
        },
      })) as Operation[];
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

  const getOperationsForCell = (cellId: string) => operations.filter((op) => op.cell_id === cellId);

  const groupOperations = (ops: Operation[]) => ({
    active: ops.filter((op) => op.status === "in_progress"),
    buffer: ops.filter((op) => op.status === "not_started").slice(0, 5),
    expected: ops.filter((op) => op.status === "not_started").slice(5),
  });

  if (loading) {
    return (
      <div>
        <SectionHeader title={t("qrm.dashboard", "QRM Dashboard")} />
        <Card className="border-border/50">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cells || cells.length === 0) {
    return (
      <div>
        <SectionHeader title={t("qrm.dashboard", "QRM Dashboard")} />
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Layers className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t("qrm.noCells", "No cells configured yet.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalWIP = Object.values(cellsMetrics).reduce((sum, m) => sum + (m?.current_wip ?? 0), 0);
  const atCapacity = Object.values(cellsMetrics).filter((m) => m?.status === "at_capacity").length;
  const nearCapacity = Object.values(cellsMetrics).filter((m) => m?.status === "warning").length;

  return (
    <div>
      <SectionHeader
        title={t("qrm.dashboard", "QRM Dashboard")}
        subtitle={`${cells.length} cells`}
        stats={
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">WIP:</span>
              <span className="font-semibold tabular-nums">{totalWIP}</span>
            </div>
            {atCapacity > 0 && (
              <Badge variant="destructive" className="font-normal">
                {atCapacity} at capacity
              </Badge>
            )}
            {nearCapacity > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 font-normal">
                {nearCapacity} warning
              </Badge>
            )}
          </div>
        }
      />
      
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {cells.map((cell) => {
              const metrics = cellsMetrics[cell.id];
              const cellOps = getOperationsForCell(cell.id);
              const grouped = groupOperations(cellOps);
              const isExpanded = expandedCells.has(cell.id);
              const wipPercent = metrics?.wip_limit ? (metrics.current_wip / metrics.wip_limit) * 100 : 0;

              return (
                <div key={cell.id}>
                  {/* Cell Header */}
                  <button
                    className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleCell(cell.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: cell.color || "hsl(var(--muted))" }}
                      />
                      <span className="font-medium">{cell.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {cellOps.length} {cellOps.length === 1 ? "operation" : "operations"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm tabular-nums">
                        <span className="font-semibold">{metrics?.current_wip || 0}</span>
                        {metrics?.wip_limit && (
                          <>
                            <span className="text-muted-foreground">/ {metrics.wip_limit}</span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  metrics?.status === "at_capacity" ? "bg-destructive" : "",
                                  metrics?.status === "warning" ? "bg-warning" : "",
                                  metrics?.status === "normal" || metrics?.status === "no_limit" ? "bg-emerald-500" : ""
                                )}
                                style={{ width: `${Math.min(wipPercent, 100)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      {metrics?.status === "at_capacity" && (
                        <Badge variant="destructive" className="text-xs font-normal">Full</Badge>
                      )}
                      {metrics?.status === "warning" && (
                        <Badge className="bg-warning/20 text-warning border-warning/30 text-xs font-normal">Warning</Badge>
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {grouped.active.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active ({grouped.active.length})
                          </div>
                          <div className="space-y-1">
                            {grouped.active.map((op) => (
                              <button
                                key={op.id}
                                className="flex items-center justify-between w-full text-sm p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                onClick={() => navigate(`/admin/operations`)}
                              >
                                <span className="font-medium">{op.part.job.job_number}</span>
                                <span className="text-muted-foreground">{op.part.part_number}</span>
                                <Badge variant="secondary" className="text-xs font-normal">{op.operation_name}</Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {grouped.buffer.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Buffer ({grouped.buffer.length})
                          </div>
                          <div className="space-y-1">
                            {grouped.buffer.map((op) => (
                              <button
                                key={op.id}
                                className="flex items-center justify-between w-full text-sm p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-lg hover:bg-blue-500/10 transition-colors"
                                onClick={() => navigate(`/admin/operations`)}
                              >
                                <span className="font-medium">{op.part.job.job_number}</span>
                                <span className="text-muted-foreground">{op.part.part_number}</span>
                                <Badge variant="outline" className="text-xs font-normal">{op.operation_name}</Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {grouped.expected.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            Expected ({grouped.expected.length})
                          </div>
                          <div className="space-y-1">
                            {grouped.expected.slice(0, 3).map((op) => (
                              <button
                                key={op.id}
                                className="flex items-center justify-between w-full text-sm p-2.5 bg-muted/30 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                                onClick={() => navigate(`/admin/operations`)}
                              >
                                <span className="font-medium">{op.part.job.job_number}</span>
                                <span className="text-muted-foreground">{op.part.part_number}</span>
                                <Badge variant="outline" className="text-xs font-normal">{op.operation_name}</Badge>
                              </button>
                            ))}
                            {grouped.expected.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center py-1">
                                +{grouped.expected.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {cellOps.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No operations in this cell
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
