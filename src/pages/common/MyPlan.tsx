"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  TrendingUp,
  Mail,
  Info,
  ArrowUpRight,
  Cloud,
  Briefcase,
  Package,
  Users,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

const getPricingTiers = (t: (key: string) => string) => [
  {
    id: "free",
    name: "Free",
    price: t("myPlan.comingSoon"),
    description: "Try it. Very limited.",
    features: [
      "25 jobs per month",
      "250 parts per month",
      "500 MB storage",
      "Limited API access",
      "Webhooks included",
      "MCP server included",
      "Docs only",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: t("myPlan.comingSoon"),
    popular: true,
    description: "Real usage, email support.",
    features: [
      "500 jobs per month",
      "5,000 parts per month",
      "10 GB storage",
      "Full API access",
      "Webhooks",
      "MCP server",
      "Email support (no SLA)",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: t("myPlan.comingSoon"),
    description: "High limits, SSO, priority support.",
    features: [
      "Fair use (high limits)",
      "100 GB storage",
      "Full API access",
      "Webhooks + MCP server",
      "SSO/SAML authentication",
      "White-label (optional)",
      "Priority email support",
    ],
  },
];

const MyPlan: React.FC = () => {
  const { t } = useTranslation();
  const {
    subscription,
    usageStats,
    apiUsageStats,
    loading,
    error,
    getPlanDisplayName,
    getUsagePercentage,
    isAtLimit,
  } = useSubscription();

  const handleUpgradeRequest = (planName: string) => {
    const subject = encodeURIComponent(
      t("myPlan.upgradeRequest.subject", { planName })
    );
    const body = encodeURIComponent(
      t("myPlan.upgradeRequest.body", {
        planName,
        currentPlan: subscription
          ? getPlanDisplayName(subscription.plan)
          : t("myPlan.unknown"),
        tenantId: subscription?.tenant_id || "N/A",
      })
    );
    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const currentPlan = subscription?.plan || "free";
  const pricingTiers = getPricingTiers(t);
  const currentTier = pricingTiers.find((tier) => tier.id === currentPlan);

  const getPlanGradient = (plan: string) => {
    switch (plan) {
      case "premium":
        return "from-purple-600 to-violet-700";
      case "pro":
        return "from-violet-500 to-indigo-600";
      default:
        return "from-primary to-primary/80";
    }
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t("myPlan.title")}</h1>
        <p className="text-muted-foreground">{t("myPlan.subtitle")}</p>
      </div>

      {/* Current Plan Overview */}
      <Card
        className={cn(
          "mb-6 overflow-hidden border-0",
          "bg-gradient-to-br",
          getPlanGradient(currentPlan)
        )}
      >
        <CardContent className="p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">
                  {currentTier?.name || t("myPlan.unknown")} {t("myPlan.plan")}
                </h2>
                {currentTier?.popular && (
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                    {t("myPlan.mostPopular")}
                  </Badge>
                )}
              </div>
              <p className="text-white/90 mb-3">{currentTier?.description}</p>
              <div className="text-4xl font-bold">
                {currentTier?.price || "€0"}
                <span className="text-lg font-normal text-white/80 ml-2">
                  {t("myPlan.perMonth")}
                </span>
              </div>
            </div>
            {currentPlan !== "premium" && (
              <Button
                size="lg"
                onClick={() =>
                  handleUpgradeRequest(currentPlan === "free" ? "Pro" : "Premium")
                }
                className="bg-white text-primary hover:bg-white/90 font-semibold"
              >
                <ArrowUpRight className="mr-2 h-5 w-5" />
                {t("myPlan.upgradePlan")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Statistics */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t("myPlan.usageThisMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parts Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("myPlan.parts")}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageStats?.parts_this_month || 0} /{" "}
                    {subscription?.max_parts_per_month || "∞"}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(
                    usageStats?.parts_this_month || 0,
                    subscription?.max_parts_per_month || null
                  )}
                  className={cn(
                    "h-2",
                    isAtLimit(
                      usageStats?.parts_this_month || 0,
                      subscription?.max_parts_per_month || null
                    ) && "[&>div]:bg-destructive"
                  )}
                />
                {isAtLimit(
                  usageStats?.parts_this_month || 0,
                  subscription?.max_parts_per_month || null
                ) && (
                  <Alert className="mt-2 bg-yellow-500/10 border-yellow-500/30">
                    <AlertDescription className="text-sm">
                      {t("myPlan.partsLimitReached")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Jobs Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("myPlan.totalJobs")}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageStats?.total_jobs || 0}{" "}
                    {subscription?.max_jobs && `/ ${subscription.max_jobs}`}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(
                    usageStats?.total_jobs || 0,
                    subscription?.max_jobs || null
                  )}
                  className="h-2 [&>div]:bg-green-500"
                />
              </div>

              {/* Storage Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("myPlan.storage")}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {(subscription?.current_storage_gb || 0).toFixed(2)} GB /{" "}
                    {subscription?.max_storage_gb || "∞"} GB
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(
                    subscription?.current_storage_gb || 0,
                    subscription?.max_storage_gb || null
                  )}
                  className="h-2 [&>div]:bg-blue-500"
                />
              </div>

              {/* API Usage */}
              {apiUsageStats && (
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t("myPlan.apiRequests")}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {apiUsageStats.today_requests} /{" "}
                      {apiUsageStats.daily_limit || "∞"} {t("myPlan.today")}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      apiUsageStats.today_requests,
                      apiUsageStats.daily_limit
                    )}
                    className={cn(
                      "h-2",
                      isAtLimit(apiUsageStats.today_requests, apiUsageStats.daily_limit)
                        ? "[&>div]:bg-destructive"
                        : "[&>div]:bg-orange-500"
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {apiUsageStats.this_month_requests.toLocaleString()} {t("myPlan.requestsThisMonth")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                value: usageStats?.active_jobs || 0,
                label: t("myPlan.activeJobs"),
                color: "text-primary",
              },
              {
                value: usageStats?.completed_jobs || 0,
                label: t("myPlan.completedJobs"),
                color: "text-green-500",
              },
              {
                value: usageStats?.total_operators || 0,
                label: t("myPlan.operators"),
                color: "text-blue-500",
              },
              {
                value: usageStats?.total_admins || 0,
                label: t("myPlan.admins"),
                color: "text-violet-500",
              },
            ].map((stat, i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className={cn("text-3xl font-bold", stat.color)}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Plan Features & Upgrade Options */}
        <div className="space-y-6">
          {/* Current Plan Features */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t("myPlan.planFeatures")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentTier?.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Upgrade Info */}
          {currentPlan !== "premium" && (
            <Card className="glass-card border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{t("myPlan.readyToUpgrade")}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentPlan === "free"
                    ? t("myPlan.upgradeFromFree")
                    : t("myPlan.upgradeFromPro")}
                </p>
                <Separator className="my-4 bg-white/10" />
                <p className="text-xs text-muted-foreground mb-4">
                  {t("myPlan.contactToUpgrade")}
                </p>
                <Button
                  className="w-full cta-button"
                  onClick={() =>
                    handleUpgradeRequest(
                      currentPlan === "free" ? "Pro" : "Premium"
                    )
                  }
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {t("myPlan.requestUpgrade")}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  {t("myPlan.noSalesCalls")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
};

export default MyPlan;
