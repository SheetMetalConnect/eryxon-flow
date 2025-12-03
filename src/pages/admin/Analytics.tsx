import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Activity, ArrowRight } from "lucide-react";

const AnalyticsDashboard = () => {
    const navigate = useNavigate();

    const cards = [
        {
            title: "OEE & State Analysis",
            description: "Monitor Overall Equipment Effectiveness, availability, performance, and quality metrics.",
            icon: <Activity className="h-8 w-8 text-brand-primary" />,
            route: ROUTES.ADMIN.ANALYTICS.OEE,
            color: "bg-blue-500/10 border-blue-500/20",
        },
        {
            title: "Production Reliability",
            description: "Analyze production start date reliability and schedule adherence trends.",
            icon: <Clock className="h-8 w-8 text-brand-accent" />,
            route: ROUTES.ADMIN.ANALYTICS.RELIABILITY,
            color: "bg-amber-500/10 border-amber-500/20",
        },
        {
            title: "QRM Indicators",
            description: "Track Quick Response Manufacturing metrics, lead times, and authorization delays.",
            icon: <BarChart3 className="h-8 w-8 text-green-500" />,
            route: ROUTES.ADMIN.ANALYTICS.QRM_DASHBOARD,
            color: "bg-green-500/10 border-green-500/20",
        },
    ];

    return (
        <div className="space-y-6 p-6 pb-16">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                <p className="text-muted-foreground">
                    Gain insights into production performance, reliability, and lead times.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        className={`glass-card relative overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group`}
                        onClick={() => navigate(card.route)}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-transparent via-transparent to-white/5 pointer-events-none`} />

                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className={`p-3 rounded-xl ${card.color} backdrop-blur-sm`}>
                                    {card.icon}
                                </div>
                                <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-foreground transition-colors">
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </div>
                            <CardTitle className="mt-4 text-xl">{card.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-base">
                                {card.description}
                            </CardDescription>
                        </CardContent>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
