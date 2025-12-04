import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReliabilityMetrics } from "@/hooks/useReliabilityMetrics";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

// Centralized styling
const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: "hsl(var(--popover))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--popover-foreground))",
        borderRadius: "8px",
    },
};

const AXIS_STYLE = {
    stroke: "hsl(var(--muted-foreground))",
};

const ReliabilityCharts = () => {
    const { t } = useTranslation();
    const { data: metrics, isLoading } = useReliabilityMetrics(30);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!metrics) {
        return (
            <Card className="glass-card">
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">{t("analytics.noReliabilityData")}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Summary Stats */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>{t("reliability.summary")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t("reliability.totalOperations")}</div>
                            <div className="text-2xl font-bold">{metrics.totalOperations}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t("reliability.onTime")}</div>
                            <div className="text-2xl font-bold text-[hsl(var(--color-success))]">
                                {metrics.onTimeOperations}
                                <span className="text-sm font-normal ml-1">({metrics.onTimePercentage}%)</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t("reliability.late")}</div>
                            <div className="text-2xl font-bold text-[hsl(var(--color-warning))]">
                                {metrics.lateOperations}
                                <span className="text-sm font-normal ml-1">({metrics.latePercentage}%)</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t("reliability.avgDelay")}</div>
                            <div className="text-2xl font-bold">
                                {metrics.avgDelayMinutes}
                                <span className="text-sm font-normal ml-1">{t("reliability.minutes")}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* On-Time Performance Trend */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>{t("reliability.onTimePerformance")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        {metrics.weeklyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics.weeklyTrend} accessibilityLayer>
                                    <defs>
                                        <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--color-success))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--color-success))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border-subtle))"
                                        vertical={false}
                                    />
                                    <XAxis dataKey="date" {...AXIS_STYLE} />
                                    <YAxis domain={[0, 100]} {...AXIS_STYLE} />
                                    <Tooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number) => [`${value}%`, ""]}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="onTime"
                                        stroke="hsl(var(--color-success))"
                                        fillOpacity={1}
                                        fill="url(#colorOnTime)"
                                        name={t("reliability.onTimePercent")}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">{t("analytics.noTrendData")}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Average Delay Trend */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>{t("reliability.avgDelayTrend")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        {metrics.delayTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.delayTrend} accessibilityLayer>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border-subtle))"
                                        vertical={false}
                                    />
                                    <XAxis dataKey="date" {...AXIS_STYLE} />
                                    <YAxis {...AXIS_STYLE} />
                                    <Tooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number) => [`${value} min`, ""]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="delay"
                                        stroke="hsl(var(--color-warning))"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: "hsl(var(--color-warning))" }}
                                        name={t("reliability.delayMin")}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">{t("analytics.noTrendData")}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Reliability by Cell */}
            {metrics.byCell.length > 0 && (
                <Card className="glass-card md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("reliability.byCell")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={metrics.byCell}
                                    layout="vertical"
                                    margin={{ left: 80 }}
                                    accessibilityLayer
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border-subtle))"
                                        horizontal={false}
                                    />
                                    <XAxis type="number" domain={[0, 100]} {...AXIS_STYLE} />
                                    <YAxis
                                        dataKey="cellName"
                                        type="category"
                                        {...AXIS_STYLE}
                                        width={75}
                                    />
                                    <Tooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number) => [`${value}%`, ""]}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="onTimePercentage"
                                        fill="hsl(var(--color-success))"
                                        radius={[0, 4, 4, 0]}
                                        name={t("reliability.onTimePercent")}
                                        barSize={20}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

ReliabilityCharts.displayName = "ReliabilityCharts";

export { ReliabilityCharts };
