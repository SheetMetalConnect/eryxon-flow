import React, { memo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
} from "recharts";
import { useTranslation } from "react-i18next";
import { QRMDashboardMetrics } from "@/hooks/useQRMDashboardMetrics";

// --- Centralized Chart Styling (Design System) ---
const COLORS = {
    primary: "hsl(var(--brand-primary))",
    success: "hsl(var(--color-success))",
    warning: "hsl(var(--color-warning))",
    error: "hsl(var(--color-error))",
    info: "hsl(var(--color-info))",
    muted: "hsl(var(--muted-foreground))",
    grid: "rgba(255,255,255,0.1)",
};

// Centralized tooltip style for consistency
const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
    cursor: { fill: "rgba(255,255,255,0.05)" },
};

// Centralized axis styling
const AXIS_STYLE = {
    stroke: COLORS.muted,
    fontSize: 12,
    tickLine: false,
    axisLine: false,
};

// WIP Age gradient colors
const AGE_COLORS = [
    COLORS.success, // 0-2 days
    COLORS.info,    // 3-5 days
    COLORS.warning, // 6-10 days
    COLORS.error,   // >10 days
];

// --- MCT Chart ---
export const MCTChart = memo(({ data }: { data: QRMDashboardMetrics["mct"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full" role="img" aria-label={t("qrm.mct.title")}>
            <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.current.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">{t("qrm.mct.days")}</span>
            </div>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data.trend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        accessibilityLayer
                    >
                        <defs>
                            <linearGradient id="colorMct" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke={COLORS.muted}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke={COLORS.muted}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                            itemStyle={{ color: COLORS.primary }}
                        />
                        <ReferenceLine y={data.target} stroke={COLORS.success} strokeDasharray="3 3" label={{ value: t("qrm.mct.target"), fill: COLORS.success, fontSize: 10, position: "insideBottomRight" }} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={COLORS.primary}
                            fillOpacity={1}
                            fill="url(#colorMct)"
                            strokeWidth={2}
                            name={t("qrm.mct.title")}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

// Helper to get color based on performance value
const getPerformanceColor = (value: number) => {
    if (value >= 95) return COLORS.success;
    if (value >= 85) return COLORS.warning;
    return COLORS.error;
};

// --- OTP Gauge ---
export const OTPGauge = memo(({ data }: { data: QRMDashboardMetrics["otp"] }) => {
    const { t } = useTranslation();
    const color = getPerformanceColor(data.current);

    // Data for the semi-circle gauge
    const gaugeData = [
        { name: "value", value: data.current },
        { name: "remainder", value: 100 - data.current },
    ];

    return (
        <div className="h-full w-full flex flex-col items-center justify-center relative" role="img" aria-label={`${t("qrm.otp.title")}: ${data.current.toFixed(1)}%`}>
            <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart accessibilityLayer>
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            name={t("qrm.otp.title")}
                        >
                            <Cell key="value" fill={color} />
                            <Cell key="remainder" fill={COLORS.grid} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-16">
                    <span className="text-4xl font-bold" style={{ color }}>{data.current.toFixed(1)}%</span>
                    <span className="text-sm text-muted-foreground">{t("qrm.otp.onTime")}</span>
                </div>
            </div>
            {/* Mini Trend Line */}
            <div className="h-[40px] w-full px-8 mt-[-20px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend} accessibilityLayer>
                        <Area type="monotone" dataKey="value" stroke={color} fill="none" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

// --- Queue Time Chart ---
export const QueueTimeChart = memo(({ data }: { data: QRMDashboardMetrics["queueTime"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full" role="img" aria-label={t("qrm.queueTime.title")}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data.byCell}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    accessibilityLayer
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="cellName"
                        type="category"
                        width={100}
                        tick={{ fill: COLORS.muted, fontSize: 12 }}
                        {...AXIS_STYLE}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="avgQueueTime" name={t("qrm.queueTime.hours")} radius={[0, 4, 4, 0]} barSize={20}>
                        {data.byCell.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.error : COLORS.info} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

// --- Cycle Time Chart ---
export const CycleTimeChart = memo(({ data }: { data: QRMDashboardMetrics["cycleTime"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full" role="img" aria-label={t("qrm.cycleTime.title")}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data.byOperation}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    accessibilityLayer
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="operationType" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(value: number, name: string) => {
                            if (name === "median") return [`${value} ${t("qrm.cycleTime.minutes")}`, t("qrm.cycleTime.median")];
                            return [`${value} ${t("qrm.cycleTime.minutes")}`, name];
                        }}
                    />
                    <Bar
                        dataKey="median"
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                        name={t("qrm.cycleTime.median")}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

// --- WIP Age Chart ---
export const WIPAgeChart = memo(({ data }: { data: QRMDashboardMetrics["wipAge"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full flex flex-col justify-center" role="img" aria-label={`${t("qrm.wipAge.title")}: ${data.totalWip} ${t("qrm.wipAge.jobs")}`}>
            <div className="mb-2 flex justify-between items-end px-2">
                <span className="text-sm text-muted-foreground">{t("qrm.wipAge.jobs")}</span>
                <span className="text-2xl font-bold">{data.totalWip}</span>
            </div>
            <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data.distribution}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        accessibilityLayer
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="label"
                            type="category"
                            width={50}
                            tick={{ fill: COLORS.muted, fontSize: 12 }}
                            {...AXIS_STYLE}
                        />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} name={t("qrm.wipAge.jobs")}>
                            {data.distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

// --- Issue Rate Chart ---
export const IssueRateChart = memo(({ data }: { data: QRMDashboardMetrics["issueRate"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full" role="img" aria-label={t("qrm.issueRate.title")}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data.byCategory}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    accessibilityLayer
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="category"
                        type="category"
                        width={80}
                        tick={{ fill: COLORS.muted, fontSize: 12 }}
                        {...AXIS_STYLE}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="rate" name={t("qrm.issueRate.rate")} radius={[0, 4, 4, 0]} barSize={20} fill={COLORS.warning} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

// --- Reliability Heatmap ---
export const ReliabilityHeatmap = memo(({ data }: { data: QRMDashboardMetrics["reliability"] }) => {
    const { t } = useTranslation();

    // Helper to get color based on reliability score
    const getCellColor = (value: number) => {
        if (value >= 95) return COLORS.success;
        if (value >= 90) return COLORS.info;
        if (value >= 80) return COLORS.warning;
        return COLORS.error;
    };

    return (
        <div className="h-full w-full overflow-auto" role="table" aria-label={t("qrm.reliability.title")}>
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        <th className="text-left font-medium text-muted-foreground pb-2" scope="col">{t("qrm.reliability.cell")}</th>
                        {data.periodLabels.map((label, i) => (
                            <th key={i} className="text-center font-medium text-muted-foreground pb-2 text-xs" scope="col">{label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.heatmap.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                            <th className="py-2 font-medium text-left" scope="row">{row.cellName}</th>
                            {row.values.map((val, j) => (
                                <td key={j} className="py-2 text-center">
                                    <div
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold text-white transition-transform hover:scale-110"
                                        style={{ backgroundColor: getCellColor(val) }}
                                        title={`${row.cellName}: ${val}% ${t("qrm.reliability.title")}`}
                                        role="cell"
                                        aria-label={`${row.cellName} ${data.periodLabels[j]}: ${val}%`}
                                    >
                                        {val}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

// --- Throughput Chart ---
export const ThroughputChart = memo(({ data }: { data: QRMDashboardMetrics["throughput"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full overflow-y-auto pr-2 custom-scrollbar" role="list" aria-label={t("qrm.throughput.title")}>
            <div className="space-y-4">
                {data.byCell.map((cell, index) => (
                    <div key={index} className="flex items-center gap-4" role="listitem">
                        <div className="w-24 text-sm font-medium text-muted-foreground truncate" title={cell.cellName}>
                            {cell.cellName}
                        </div>
                        <div className="flex-1 h-8" aria-hidden="true">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cell.trend.map((val, i) => ({ i, val }))} accessibilityLayer>
                                    <defs>
                                        <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="val"
                                        stroke={COLORS.success}
                                        fill={`url(#grad-${index})`}
                                        strokeWidth={1.5}
                                        name={t("qrm.throughput.units")}
                                    />
                                    <Tooltip
                                        {...TOOLTIP_STYLE}
                                        formatter={(value: number) => [`${value} ${t("qrm.throughput.units")}`, t("qrm.throughput.title")]}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-16 text-right font-bold text-sm" aria-label={`${cell.cellName}: ${cell.current} ${t("qrm.throughput.unitsPerDay")}`}>
                            {cell.current} <span className="text-xs font-normal text-muted-foreground">u/d</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Add display names for debugging
MCTChart.displayName = "MCTChart";
OTPGauge.displayName = "OTPGauge";
QueueTimeChart.displayName = "QueueTimeChart";
CycleTimeChart.displayName = "CycleTimeChart";
WIPAgeChart.displayName = "WIPAgeChart";
IssueRateChart.displayName = "IssueRateChart";
ReliabilityHeatmap.displayName = "ReliabilityHeatmap";
ThroughputChart.displayName = "ThroughputChart";
