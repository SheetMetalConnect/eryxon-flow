import { useTranslation } from "react-i18next";
import { Zap, PauseCircle, AlarmClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardAttention } from "@/hooks/useDashboardAttention";
import { minutesOverSchedule } from "@/lib/admin/dashboardAttention";

/**
 * "Needs attention" — derived, read-only signals a team leader scans first:
 * Bullet Card priorities, Yellow Card (on-hold) operations, and operations
 * clocked over their planned time.
 */
export function DashboardAttentionCard() {
  const { t } = useTranslation();
  const { rushCount, onHoldCount, overHoursOps, isLoading } = useDashboardAttention();

  const tiles = [
    { key: "bulletCard", icon: Zap, count: rushCount, label: t("qrm.bulletCard"), tone: "text-destructive" },
    { key: "yellowCard", icon: PauseCircle, count: onHoldCount, label: t("qrm.yellowCard"), tone: "text-amber-500" },
    { key: "over", icon: AlarmClock, count: overHoursOps.length, label: t("dashboard.attention.overHours"), tone: "text-orange-500" },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl">{t("dashboard.attention.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 pb-4 md:grid-cols-3">
          {tiles.map(({ key, icon: Icon, count, label, tone }) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className={`h-4 w-4 ${tone}`} />
                {label}
              </div>
              <p className="mt-1 text-3xl font-bold">{isLoading ? "–" : count}</p>
            </div>
          ))}
        </div>

        {overHoursOps.length > 0 && (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-muted-foreground">
                  <th className="px-3 py-2">{t("dashboard.job")}</th>
                  <th className="px-3 py-2">{t("dashboard.operation")}</th>
                  <th className="px-3 py-2 text-right">{t("dashboard.attention.minutesOver")}</th>
                </tr>
              </thead>
              <tbody>
                {overHoursOps.slice(0, 8).map((op) => (
                  <tr key={op.id} className="border-b border-white/5">
                    <td className="px-3 py-2">{op.part?.job?.job_number ?? "—"}</td>
                    <td className="px-3 py-2">{op.operation_name}</td>
                    <td className="px-3 py-2 text-right font-semibold text-orange-500">
                      +{minutesOverSchedule(op)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
