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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ReliabilityCharts = () => {
    // Mock Data
    const reliabilityData = [
        { date: "Week 1", onTime: 88, late: 12 },
        { date: "Week 2", onTime: 92, late: 8 },
        { date: "Week 3", onTime: 85, late: 15 },
        { date: "Week 4", onTime: 95, late: 5 },
        { date: "Week 5", onTime: 90, late: 10 },
    ];

    const startDelayData = [
        { date: "Mon", delay: 15 }, // minutes
        { date: "Tue", delay: 5 },
        { date: "Wed", delay: 25 },
        { date: "Thu", delay: 10 },
        { date: "Fri", delay: 8 },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* On-Time Start Performance */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>On-Time Start Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={reliabilityData}>
                                <defs>
                                    <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--color-success))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--color-success))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                                <YAxis stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="onTime"
                                    stroke="hsl(var(--color-success))"
                                    fillOpacity={1}
                                    fill="url(#colorOnTime)"
                                    name="On-Time %"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Average Start Delay */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>Average Start Delay (Minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={startDelayData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                                <YAxis stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="delay"
                                    stroke="hsl(var(--color-warning))"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: "hsl(var(--color-warning))" }}
                                    name="Delay (min)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export { ReliabilityCharts };
