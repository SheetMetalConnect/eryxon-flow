import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOEEMetrics } from "@/hooks/useOEEMetrics";
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
    cursor: { fill: "hsl(var(--muted)/0.2)" },
};

const AXIS_STYLE = {
    stroke: "hsl(var(--muted-foreground))",
};

const OEECharts = () => {
    const { t } = useTranslation();
    const { data: metrics, isLoading } = useOEEMetrics(30);

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
                    <p className="text-muted-foreground">{t("analytics.noOEEData")}</p>
                </CardContent>
            </Card>
        );
    }

    // Transform OEE breakdown data
    const oeeData = [
        { name: t("oee.availability"), value: metrics.availability, fill: "hsl(var(--brand-primary))" },
        { name: t("oee.performance"), value: metrics.performance, fill: "hsl(var(--brand-accent))" },
        { name: t("oee.quality"), value: metrics.quality, fill: "hsl(var(--color-success))" },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* OEE Breakdown */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{t("oee.breakdown")}</span>
                        <span className="text-2xl font-bold text-[hsl(var(--brand-primary))]">
                            {metrics.oee}%
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={oeeData}
                                layout="vertical"
                                margin={{ left: 20 }}
                                accessibilityLayer
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border-subtle))"
                                    horizontal={false}
                                />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    {...AXIS_STYLE}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    {...AXIS_STYLE}
                                    width={100}
                                />
                                <Tooltip
                                    {...TOOLTIP_STYLE}
                                    formatter={(value: number) => [`${value}%`, ""]}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Operation States */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>{t("oee.operationStates")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {metrics.stateBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart accessibilityLayer>
                                    <Pie
                                        data={metrics.stateBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {metrics.stateBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number) => [`${value}%`, ""]}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-muted-foreground">{t("analytics.noData")}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* OEE Trend */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>{t("oee.trend")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        {metrics.trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.trend} accessibilityLayer>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border-subtle))"
                                        vertical={false}
                                    />
                                    <XAxis dataKey="date" {...AXIS_STYLE} />
                                    <YAxis domain={[0, 100]} {...AXIS_STYLE} />
                                    <Tooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number, name: string) => [
                                            `${value}%`,
                                            name === "oee" ? "OEE" : name
                                        ]}
                                    />
                                    <Bar
                                        dataKey="oee"
                                        fill="hsl(var(--brand-primary))"
                                        radius={[4, 4, 0, 0]}
                                        name="OEE"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">{t("analytics.noTrendData")}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* OEE by Cell */}
            {metrics.byCell.length > 0 && (
                <Card className="glass-card md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("oee.byCell")}</CardTitle>
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
                                        dataKey="oee"
                                        fill="hsl(var(--brand-primary))"
                                        radius={[0, 4, 4, 0]}
                                        name="OEE"
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

OEECharts.displayName = "OEECharts";

export { OEECharts };
