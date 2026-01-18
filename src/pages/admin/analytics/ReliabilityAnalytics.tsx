import React from "react";
import { ReliabilityCharts } from "@/components/analytics/ReliabilityCharts";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";

const ReliabilityAnalytics = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 p-6 pb-16">
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
                    <h1 className="text-3xl font-bold tracking-tight">Production Reliability</h1>
                    <p className="text-muted-foreground">
                        Analysis of production start dates and schedule adherence.
                    </p>
                </div>
            </div>

            <ReliabilityCharts />
        </div>
    );
};

export default ReliabilityAnalytics;
