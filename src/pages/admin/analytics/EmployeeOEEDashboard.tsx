import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users, Clock, Activity, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { useEmployeeOEE } from "@/hooks/useEmployeeOEE";
import { ROUTES } from "@/routes";

const COLORS = {
  scheduled: "hsl(var(--neutral-400))",
  attendance: "hsl(var(--brand-primary))",
  productive: "hsl(var(--color-success))",
  good: "hsl(var(--color-success))",
  scrap: "hsl(var(--color-error))",
  rework: "hsl(var(--color-warning))",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--popover))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--popover-foreground))",
    borderRadius: "8px",
  },
};

export default function EmployeeOEEDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<number>(7);
  const { data: metrics, isLoading, error } = useEmployeeOEE(dateRange);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {t("employeeOEE.noData", "No employee OEE data available yet")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare quality breakdown data
  const qualityData = [
    { name: t("employeeOEE.good", "Good"), value: metrics.goodParts, color: COLORS.good },
    { name: t("employeeOEE.scrap", "Scrap"), value: metrics.scrapParts, color: COLORS.scrap },
    { name: t("employeeOEE.rework", "Rework"), value: metrics.reworkParts, color: COLORS.rework },
  ].filter(d => d.value > 0);

  // Prepare hours comparison data
  const hoursComparisonData = [
    {
      name: t("employeeOEE.hours", "Hours"),
      scheduled: metrics.scheduledHours,
      attendance: metrics.attendanceHours,
      productive: metrics.productiveHours,
    },
  ];

  return (
    <div className="space-y-6 p-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(ROUTES.ADMIN.ANALYTICS.ROOT)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {t("employeeOEE.title", "Employee OEE Dashboard")}
            </h1>
            <p className="text-muted-foreground">
              {t("employeeOEE.subtitle", "Track attendance, productivity, and quality metrics")}
            </p>
          </div>
        </div>

        <Select
          value={dateRange.toString()}
          onValueChange={(v) => setDateRange(parseInt(v))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("employeeOEE.last7Days", "Last 7 days")}</SelectItem>
            <SelectItem value="14">{t("employeeOEE.last14Days", "Last 14 days")}</SelectItem>
            <SelectItem value="30">{t("employeeOEE.last30Days", "Last 30 days")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">{t("employeeOEE.scheduled", "Scheduled")}</span>
            </div>
            <p className="text-2xl font-bold">{metrics.scheduledHours}h</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">{t("employeeOEE.attendance", "Attendance")}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{metrics.attendanceHours}h</p>
            <p className="text-xs text-muted-foreground">{metrics.availability}%</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">{t("employeeOEE.productive", "Productive")}</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--color-success))]">
              {metrics.productiveHours}h
            </p>
            <p className="text-xs text-muted-foreground">{metrics.performance}%</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">{t("employeeOEE.overallOEE", "Overall OEE")}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{metrics.oee}%</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">A: {metrics.availability}%</Badge>
              <Badge variant="outline" className="text-xs">P: {metrics.performance}%</Badge>
              <Badge variant="outline" className="text-xs">Q: {metrics.quality}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hours Comparison */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("employeeOEE.hoursComparison", "Hours Comparison")}</CardTitle>
            <CardDescription>
              {t("employeeOEE.hoursComparisonDesc", "Scheduled vs Attendance vs Productive")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v}h`} />
                  <Legend />
                  <Bar
                    dataKey="scheduled"
                    name={t("employeeOEE.scheduled", "Scheduled")}
                    fill={COLORS.scheduled}
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="attendance"
                    name={t("employeeOEE.attendance", "Attendance")}
                    fill={COLORS.attendance}
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="productive"
                    name={t("employeeOEE.productive", "Productive")}
                    fill={COLORS.productive}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quality Breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("employeeOEE.qualityBreakdown", "Quality Breakdown")}</CardTitle>
            <CardDescription>
              {t("employeeOEE.totalParts", "Total parts")}: {metrics.totalPartsProduced}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {qualityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t("employeeOEE.noPartsData", "No production data yet")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("employeeOEE.dailyTrend", "Daily Trend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {metrics.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="oee"
                    name="OEE"
                    stroke="hsl(var(--brand-primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t("employeeOEE.noTrendData", "No trend data available")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* By Operator Table */}
      {metrics.byOperator.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("employeeOEE.byOperator", "Performance by Operator")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2">{t("employeeOEE.operator", "Operator")}</th>
                    <th className="text-right py-3 px-2">{t("employeeOEE.scheduled", "Scheduled")}</th>
                    <th className="text-right py-3 px-2">{t("employeeOEE.attendance", "Attendance")}</th>
                    <th className="text-right py-3 px-2">{t("employeeOEE.productive", "Productive")}</th>
                    <th className="text-right py-3 px-2">OEE</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byOperator.map((op, index) => (
                    <tr
                      key={op.operatorId}
                      className={`border-b border-border/50 ${index === 0 ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Badge variant="default" className="h-5">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t("employeeOEE.top", "Top")}
                            </Badge>
                          )}
                          <div>
                            <p className="font-medium">{op.operatorName}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {op.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">{op.scheduledHours}h</td>
                      <td className="text-right py-3 px-2">{op.attendanceHours}h</td>
                      <td className="text-right py-3 px-2">{op.productiveHours}h</td>
                      <td className="text-right py-3 px-2">
                        <Badge
                          variant={op.oee >= 80 ? "default" : op.oee >= 60 ? "secondary" : "outline"}
                        >
                          {op.oee}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
