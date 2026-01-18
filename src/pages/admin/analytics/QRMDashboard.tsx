import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useQRMDashboardMetrics } from "@/hooks/useQRMDashboardMetrics";
import {
  MCTChart,
  OTPGauge,
  QueueTimeChart,
  CycleTimeChart,
  WIPAgeChart,
  IssueRateChart,
  ThroughputChart,
  ReliabilityHeatmap,
} from "@/components/analytics/QRMDashboardCharts";
import { Loader2 } from "lucide-react";

const QRMDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(30);

  const { data: metrics, isLoading, isError, error, isFetching, refetch } = useQRMDashboardMetrics(dateRange);

  // Show loading only when actually fetching
  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{t("common.error")}: {error?.message || t("qrm.loadError")}</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN.ANALYTICS.ROOT)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.goBack")}
        </Button>
      </div>
    );
  }

  // Handle case where data is not available (query might be disabled)
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">{t("qrm.noData")}</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN.ANALYTICS.ROOT)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.goBack")}
        </Button>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">{t("qrm.dashboardTitle")}</h1>
            <p className="text-muted-foreground">
              {t("qrm.dashboardSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Calendar className="h-4 w-4" />
            <span>{t("qrm.last30Days")}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            <span>{t("qrm.refresh")}</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Row 1: Outcome Metrics */}
        <div className="md:col-span-1 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/jobs?status=completed")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.otp.title")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <OTPGauge data={metrics.otp} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/jobs?status=completed")}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.mct.title")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <MCTChart data={metrics.mct} />
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Flow Health */}
        <div className="md:col-span-1 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/jobs?status=active")}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.wipAge.title")}</CardTitle>
              <span className="text-2xl font-bold">{metrics.wipAge.totalWip}</span>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <WIPAgeChart data={metrics.wipAge} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/operations")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.queueTime.title")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <QueueTimeChart data={metrics.queueTime} />
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Operational Detail */}
        <div className="md:col-span-1 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/operations")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.cycleTime.title")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <CycleTimeChart data={metrics.cycleTime} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/issues")}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.issueRate.title")}</CardTitle>
              <span className="text-2xl font-bold">{metrics.issueRate.totalIssues}</span>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <IssueRateChart data={metrics.issueRate} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/capacity")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.throughput.title")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <ThroughputChart data={metrics.throughput} />
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Reliability Heatmap */}
        <div className="md:col-span-3 h-[300px]">
          <Card
            className="glass-card h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/admin/operations")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("qrm.reliability.title")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <ReliabilityHeatmap data={metrics.reliability} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default QRMDashboard;
