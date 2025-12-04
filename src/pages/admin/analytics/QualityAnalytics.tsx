import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, CheckCircle2, Trash2, RefreshCw, AlertTriangle, Activity, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQualityMetrics } from "@/hooks/useQualityMetrics";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function QualityAnalytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: qualityMetrics, isLoading } = useQualityMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("analytics.qualityTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("analytics.qualitySubtitle")}
          </p>
        </div>
      </div>

      <hr className="title-divider" />

      {qualityMetrics && (qualityMetrics.totalProduced > 0 || qualityMetrics.issueMetrics.total > 0) ? (
        <>
          {/* Main Quality Metrics */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                {t("quality.partsQuality")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Yield Rate */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t("quality.yieldRate")}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    qualityMetrics.overallYield >= 95 ? "text-[hsl(var(--color-success))]" :
                    qualityMetrics.overallYield >= 85 ? "text-[hsl(var(--color-warning))]" :
                    "text-[hsl(var(--color-error))]"
                  )}>
                    {qualityMetrics.overallYield.toFixed(1)}%
                  </div>
                </div>

                {/* Good Parts */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--color-success))]" />
                    {t("quality.goodParts")}
                  </div>
                  <div className="text-2xl font-bold text-[hsl(var(--color-success))]">
                    {qualityMetrics.totalGood.toLocaleString()}
                  </div>
                </div>

                {/* Scrap */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--color-error))]" />
                    {t("quality.scrap")}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    qualityMetrics.totalScrap > 0 ? "text-[hsl(var(--color-error))]" : ""
                  )}>
                    {qualityMetrics.totalScrap.toLocaleString()}
                    {qualityMetrics.scrapRate > 0 && (
                      <span className="text-sm font-normal ml-1">({qualityMetrics.scrapRate.toFixed(1)}%)</span>
                    )}
                  </div>
                </div>

                {/* Rework */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 text-[hsl(var(--color-warning))]" />
                    {t("quality.rework")}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    qualityMetrics.totalRework > 0 ? "text-[hsl(var(--color-warning))]" : ""
                  )}>
                    {qualityMetrics.totalRework.toLocaleString()}
                    {qualityMetrics.reworkRate > 0 && (
                      <span className="text-sm font-normal ml-1">({qualityMetrics.reworkRate.toFixed(1)}%)</span>
                    )}
                  </div>
                </div>

                {/* Issues */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--color-warning))]" />
                    {t("quality.openIssues")}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    qualityMetrics.issueMetrics.pending > 0 ? "text-[hsl(var(--color-warning))]" : ""
                  )}>
                    {qualityMetrics.issueMetrics.pending}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {qualityMetrics.issueMetrics.total}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scrap by Category */}
          {qualityMetrics.scrapByCategory.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-[hsl(var(--color-error))]" />
                  {t("quality.scrapByCategory")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {qualityMetrics.scrapByCategory.map((cat) => (
                    <Card key={cat.category} className="glass-card">
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground capitalize mb-1">{cat.category}</div>
                        <div className="text-lg font-bold text-[hsl(var(--color-error))]">{cat.quantity}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Scrap Reasons */}
          {qualityMetrics.topScrapReasons.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                  {t("quality.topScrapReasons")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {qualityMetrics.topScrapReasons.map((reason, index) => (
                    <div key={reason.code} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{reason.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {reason.quantity} units
                          </Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[hsl(var(--color-error))] rounded-full"
                            style={{
                              width: `${Math.min((reason.quantity / qualityMetrics.topScrapReasons[0].quantity) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issue Metrics */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-warning))]" />
                {t("quality.issuesByStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.pending")}</div>
                  <div className="text-xl font-bold text-[hsl(var(--color-warning))]">
                    {qualityMetrics.issueMetrics.pending}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.inProgress")}</div>
                  <div className="text-xl font-bold text-[hsl(var(--color-info))]">
                    {qualityMetrics.issueMetrics.inProgress}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.resolved")}</div>
                  <div className="text-xl font-bold text-[hsl(var(--color-success))]">
                    {qualityMetrics.issueMetrics.resolved}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.total")}</div>
                  <div className="text-xl font-bold">{qualityMetrics.issueMetrics.total}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues by Severity */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-error))]" />
                {t("quality.issuesBySeverity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.critical")}</div>
                  <div className="text-xl font-bold text-[hsl(var(--color-error))]">
                    {qualityMetrics.issueMetrics.bySeverity.critical}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.high")}</div>
                  <div className="text-xl font-bold text-[hsl(var(--color-warning))]">
                    {qualityMetrics.issueMetrics.bySeverity.high}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.medium")}</div>
                  <div className="text-xl font-bold text-[hsl(var(--color-info))]">
                    {qualityMetrics.issueMetrics.bySeverity.medium}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t("quality.low")}</div>
                  <div className="text-xl font-bold text-muted-foreground">
                    {qualityMetrics.issueMetrics.bySeverity.low}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("analytics.noQualityData")}</p>
          </CardContent>
        </Card>
      )}

      {/* Link to Parts page */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate("/admin/parts")}>
          {t("parts.title")} →
        </Button>
      </div>
    </div>
  );
}
