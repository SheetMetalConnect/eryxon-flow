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
    ComposedChart,
    Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QRMCharts = () => {
    // Mock Data
    const leadTimeData = [
        { product: "Prod A", mct: 12, touchTime: 4 },
        { product: "Prod B", mct: 18, touchTime: 6 },
        { product: "Prod C", mct: 8, touchTime: 3 },
        { product: "Prod D", mct: 24, touchTime: 8 },
    ];

    const authBacklogData = [
        { day: "Mon", pending: 5, approved: 12 },
        { day: "Tue", pending: 8, approved: 10 },
        { day: "Wed", pending: 4, approved: 15 },
        { day: "Thu", pending: 6, approved: 14 },
        { day: "Fri", pending: 3, approved: 18 },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* MCT Analysis */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>MCT vs Touch Time (Hours)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leadTimeData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" horizontal={false} />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                                <YAxis dataKey="product" type="category" stroke="hsl(var(--muted-foreground))" width={60} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                                />
                                <Legend />
                                <Bar dataKey="mct" name="MCT (Total Lead Time)" fill="hsl(var(--brand-primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="touchTime" name="Touch Time (Value Add)" fill="hsl(var(--color-success))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Authorization Backlog */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Authorization Backlog Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={authBacklogData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                                <YAxis stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        borderColor: "hsl(var(--border))",
                                        color: "hsl(var(--popover-foreground))"
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="pending" name="Pending Auth" fill="hsl(var(--color-warning))" barSize={30} radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="approved" name="Approved" stroke="hsl(var(--color-success))" strokeWidth={2} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export { QRMCharts };
