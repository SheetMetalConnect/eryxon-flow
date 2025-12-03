import React from "react";
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
    ComposedChart,
    Line,
    PieChart,
    Pie,
} from "recharts";
import { useTranslation } from "react-i18next";
import { QRMDashboardMetrics } from "@/hooks/useQRMDashboardMetrics";

// --- Colors from Design System ---
const COLORS = {
    primary: "hsl(var(--brand-primary))",
    success: "hsl(var(--color-success))",
    warning: "hsl(var(--color-warning))",
    error: "hsl(var(--color-error))",
    info: "hsl(var(--color-info))",
    muted: "hsl(var(--muted-foreground))",
    grid: "rgba(255,255,255,0.1)",
};

// --- MCT Chart ---
export const MCTChart = ({ data }: { data: QRMDashboardMetrics["mct"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full">
            <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.current.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">{t("qrm.mct.days")}</span>
            </div>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- OTP Gauge ---
export const OTPGauge = ({ data }: { data: QRMDashboardMetrics["otp"] }) => {
    const { t } = useTranslation();

    // Calculate color based on value
    const getColor = (value: number) => {
        if (value >= 95) return COLORS.success;
        if (value >= 85) return COLORS.warning;
        return COLORS.error;
    };

    const color = getColor(data.current);

    // Data for the semi-circle gauge
    const gaugeData = [
        { name: "value", value: data.current },
        { name: "remainder", value: 100 - data.current },
    ];

    return (
        <div className="h-full w-full flex flex-col items-center justify-center relative">
            <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                    <AreaChart data={data.trend}>
                        <Area type="monotone" dataKey="value" stroke={color} fill="none" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Queue Time Chart ---
export const QueueTimeChart = ({ data }: { data: QRMDashboardMetrics["queueTime"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data.byCell}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="cellName"
                        type="category"
                        width={100}
                        tick={{ fill: COLORS.muted, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="avgQueueTime" name={t("qrm.queueTime.hours")} radius={[0, 4, 4, 0]} barSize={20}>
                        {data.byCell.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.error : COLORS.info} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- Cycle Time Chart (Range Bar simulated with ComposedChart) ---
export const CycleTimeChart = ({ data }: { data: QRMDashboardMetrics["cycleTime"] }) => {
    const { t } = useTranslation();

    // Transform data for range visualization
    // We'll use a bar for the range (min to max) and a line or scatter for median
    // Actually, Recharts doesn't support box plots natively well.
    // We can use a stacked bar approach: [transparent (min), bar (max-min)]
    // But to show median, we might need a custom shape or composed chart.

    // Simplified approach: Bar chart showing Median, with Error Bars for Min/Max? 
    // Or just a simple bar chart of Median for now to keep it clean, maybe with a "range" tooltip.

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byOperation} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="operationType" stroke={COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                        formatter={(value: number, name: string, props: any) => {
                            if (name === "median") return [`${value} min`, "Median"];
                            return [`${value} min`, name];
                        }}
                    />
                    <Bar dataKey="median" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={30} name="Median (min)" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- WIP Age Chart ---
export const WIPAgeChart = ({ data }: { data: QRMDashboardMetrics["wipAge"] }) => {
    const { t } = useTranslation();

    // Gradient colors for age buckets
    const AGE_COLORS = [
        "hsl(var(--color-success))", // 0-2 days
        "hsl(var(--color-info))",    // 3-5 days
        "hsl(var(--color-warning))", // 6-10 days
        "hsl(var(--color-error))",   // >10 days
    ];

    return (
        <div className="h-full w-full flex flex-col justify-center">
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
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="label"
                            type="category"
                            width={50}
                            tick={{ fill: COLORS.muted, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Issue Rate Chart ---
export const IssueRateChart = ({ data }: { data: QRMDashboardMetrics["issueRate"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="category"
                        type="category"
                        width={80}
                        tick={{ fill: COLORS.muted, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="rate" name={t("qrm.issueRate.rate")} radius={[0, 4, 4, 0]} barSize={20} fill={COLORS.warning} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- Reliability Heatmap ---
export const ReliabilityHeatmap = ({ data }: { data: QRMDashboardMetrics["reliability"] }) => {
    const { t } = useTranslation();

    // Helper to get color based on reliability score
    const getCellColor = (value: number) => {
        if (value >= 95) return "hsl(var(--color-success))";
        if (value >= 90) return "hsl(var(--color-info))";
        if (value >= 80) return "hsl(var(--color-warning))";
        return "hsl(var(--color-error))";
    };

    return (
        <div className="h-full w-full overflow-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        <th className="text-left font-medium text-muted-foreground pb-2">{t("qrm.reliability.cell")}</th>
                        {data.weekLabels.map((label, i) => (
                            <th key={i} className="text-center font-medium text-muted-foreground pb-2 text-xs">{label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.heatmap.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 font-medium">{row.cellName}</td>
                            {[row.week1, row.week2, row.week3, row.week4].map((val, j) => (
                                <td key={j} className="py-2 text-center">
                                    <div
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold text-white"
                                        style={{ backgroundColor: getCellColor(val) }}
                                        title={`${val}%`}
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
};

// --- Throughput Chart ---
export const ThroughputChart = ({ data }: { data: QRMDashboardMetrics["throughput"] }) => {
    const { t } = useTranslation();

    return (
        <div className="h-full w-full overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
                {data.byCell.map((cell, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium text-muted-foreground truncate" title={cell.cellName}>
                            {cell.cellName}
                        </div>
                        <div className="flex-1 h-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cell.trend.map((val, i) => ({ i, val }))}>
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
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                                        formatter={(value: number) => [`${value} units`, "Throughput"]}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-16 text-right font-bold text-sm">
                            {cell.current} <span className="text-xs font-normal text-muted-foreground">u/d</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
