import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder components
const MCTChart = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">MCT Chart Placeholder</div>;
const OTPGauge = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">OTP Gauge Placeholder</div>;
const QueueTimeChart = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Queue Time Placeholder</div>;
const CycleTimeChart = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Cycle Time Placeholder</div>;
const WIPAgeChart = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">WIP Age Placeholder</div>;
const IssueRateChart = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Issue Rate Placeholder</div>;
const ThroughputChart = () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Throughput Placeholder</div>;

const QRMDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 p-6 pb-16 min-h-screen bg-background">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(ROUTES.ADMIN.ANALYTICS.ROOT)}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">QRM Production Dashboard</h1>
                        <p className="text-muted-foreground">
                            Real-time metrics for Quick Response Manufacturing performance.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Last 30 Days</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Row 1: Outcome Metrics */}
                <div className="md:col-span-1 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Delivery Reliability (OTP)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <OTPGauge />
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">MCT Trend (Manufacturing Critical-path Time)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <MCTChart />
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Flow Health */}
                <div className="md:col-span-1 lg:col-span-1 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">WIP Age Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <WIPAgeChart />
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2 lg:col-span-2 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Queue Time by Cell</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <QueueTimeChart />
                        </CardContent>
                    </Card>
                </div>

                {/* Row 3: Operational Detail */}
                <div className="md:col-span-1 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Operation Cycle Time</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <CycleTimeChart />
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Issue Rate by Category</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <IssueRateChart />
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1 h-[300px]">
                    <Card className="glass-card h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Throughput by Cell</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-3rem)]">
                            <ThroughputChart />
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
};

export default QRMDashboard;
