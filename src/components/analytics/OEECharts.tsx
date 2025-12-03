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

const OEECharts = () => {
    // Mock Data
    const oeeData = [
        { name: "Availability", value: 85, fill: "hsl(var(--brand-primary))" },
        { name: "Performance", value: 92, fill: "hsl(var(--brand-accent))" },
        { name: "Quality", value: 98, fill: "hsl(var(--color-success))" },
    ];

    const machineStateData = [
        { name: "Running", value: 65, color: "hsl(var(--color-success))" },
        { name: "Idle", value: 20, color: "hsl(var(--color-warning))" },
        { name: "Down", value: 10, color: "hsl(var(--color-error))" },
        { name: "Maintenance", value: 5, color: "hsl(var(--neutral-400))" },
    ];

    const trendData = [
        { name: "Mon", oee: 82 },
        { name: "Tue", oee: 84 },
        { name: "Wed", oee: 88 },
        { name: "Thu", oee: 85 },
        { name: "Fri", oee: 90 },
        { name: "Sat", oee: 87 },
        { name: "Sun", oee: 89 },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* OEE Breakdown */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>OEE Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={oeeData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Machine States */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Machine States</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={machineStateData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {machineStateData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* OEE Trend */}
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>OEE Trend (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                                />
                                <Bar dataKey="oee" fill="hsl(var(--brand-primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export { OEECharts };
