import { useAuth } from "@/contexts/AuthContext";
import { useAllCellsQRMMetrics } from "@/hooks/useQRMMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WIPBar, WIPIndicator } from "@/components/qrm/WIPIndicator";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * QRM Dashboard - Shows WIP metrics for all cells
 */
export function QRMDashboard() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { cellsMetrics, loading } = useAllCellsQRMMetrics(profile?.tenant_id || null);

  // Fetch cell details for display
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
          <p className="text-sm text-gray-500">
            {t("qrm.noCells", "No cells configured yet. Set up your manufacturing stages first.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const cellsWithLimits = cells.filter((cell) => cell.wip_limit !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("qrm.dashboard", "QRM Dashboard - Work in Progress")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {cellsWithLimits.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">
            {t(
              "qrm.noLimitsSet",
              "No WIP limits configured. Configure WIP limits in the Stages settings to track capacity."
            )}
          </div>
        ) : (
          cellsWithLimits.map((cell) => {
            const metrics = cellsMetrics[cell.id];

            return (
              <div key={cell.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-6 w-6 rounded"
                      style={{ backgroundColor: cell.color || "#94a3b8" }}
                    />
                    <h3 className="font-semibold">{cell.name}</h3>
                  </div>
                  {metrics && <WIPIndicator metrics={metrics} compact />}
                </div>

                {metrics && (
                  <>
                    <WIPBar
                      current={metrics.current_wip}
                      limit={metrics.wip_limit}
                      warningThreshold={metrics.wip_warning_threshold}
                      height="md"
                    />

                    {metrics.jobs_in_cell && metrics.jobs_in_cell.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{t("qrm.activeJobs", "Active Jobs")}:</span>{" "}
                        {metrics.jobs_in_cell.map((j) => j.job_number).join(", ")}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {/* Summary statistics */}
        {cellsWithLimits.length > 0 && (
          <div className="pt-4 border-t grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(cellsMetrics).reduce((sum, m) => sum + m.current_wip, 0)}
              </div>
              <div className="text-xs text-gray-600">{t("qrm.totalWIP", "Total WIP")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {
                  Object.values(cellsMetrics).filter((m) => m.status === "at_capacity")
                    .length
                }
              </div>
              <div className="text-xs text-gray-600">
                {t("qrm.cellsAtCapacity", "Cells at Capacity")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(cellsMetrics).filter((m) => m.status === "warning").length}
              </div>
              <div className="text-xs text-gray-600">
                {t("qrm.cellsNearCapacity", "Cells Near Capacity")}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
