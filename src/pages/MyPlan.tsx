import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  TrendingUp,
  Mail,
  Info,
  ArrowUp,
  CloudUpload,
  Briefcase,
  Package,
  Users,
  Loader2,
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StripeBillingSection } from '../components/billing/StripeBillingSection';

const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for small shops getting started',
    features: [
      '100 jobs per month',
      '1,000 parts per month',
      '5 GB file storage',
      'Limited API access',
      'Multi-tenant architecture',
      'Community support (docs only)',
      'Basic workflow tracking',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 97,
    popular: true,
    description: 'For growing shops with higher volume',
    features: [
      'Unlimited users',
      '1,000 jobs per month',
      '10,000 parts per month',
      '50 GB file storage',
      'Full API access',
      'Multi-tenant architecture',
      'Priority email support',
      'Advanced analytics',
      'Webhook integrations',
    ],
  },
  {
    id: 'premium',
    name: 'Enterprise',
    price: 497,
    description: 'Custom, bespoke solution',
    features: [
      'Everything in Pro',
      'Unlimited jobs & parts',
      'Unlimited storage',
      'Unlimited usage',
      'Self-hosted (on-premises)',
      'Single-tenant architecture',
      'SSO/SAML authentication',
      'Dedicated support channel',
      'Custom SLA',
      'White-label options',
      'Advanced security controls',
    ],
  },
];

export const MyPlan: React.FC = () => {
  const { t } = useTranslation();
  const { subscription, usageStats, loading, error, getPlanDisplayName, getUsagePercentage, isAtLimit } = useSubscription();

  const handleUpgradeRequest = (planName: string) => {
    const subject = encodeURIComponent(t('myPlan.upgradeRequest.subject', { planName }));
    const body = encodeURIComponent(
      t('myPlan.upgradeRequest.body', {
        planName,
        currentPlan: subscription ? getPlanDisplayName(subscription.plan) : t('myPlan.unknown'),
        tenantId: subscription?.tenant_id || 'N/A'
      })
    );
    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const currentTier = pricingTiers.find(tier => tier.id === currentPlan);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('myPlan.title')}</h1>
        <p className="text-muted-foreground">{t('myPlan.subtitle')}</p>
      </div>

      {/* Current Plan Overview */}
      <Card
        className={cn(
          "relative overflow-hidden border-0",
          currentPlan === 'premium' && "bg-gradient-to-br from-purple-600/90 to-purple-800/90",
          currentPlan === 'pro' && "bg-gradient-to-br from-blue-600/90 to-blue-800/90",
          currentPlan === 'free' && "bg-gradient-to-br from-blue-500/90 to-blue-700/90"
        )}
      >
        <CardContent className="p-6 md:p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">
                  {currentTier?.name || t('myPlan.unknown')} {t('myPlan.plan')}
                </h2>
                {currentTier?.popular && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {t('myPlan.mostPopular')}
                  </Badge>
                )}
              </div>
              <p className="text-white/90 mb-4">{currentTier?.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">${currentTier?.price || 0}</span>
                <span className="text-lg text-white/80">{t('myPlan.perMonth')}</span>
              </div>
            </div>
            <div className="md:text-right">
              {currentPlan !== 'premium' && (
                <Button
                  size="lg"
                  onClick={() => handleUpgradeRequest(currentPlan === 'free' ? 'Pro' : 'Premium')}
                  className="bg-white text-blue-600 hover:bg-white/90 font-semibold px-6"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  {t('myPlan.upgradePlan')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Statistics */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-foreground/80" />
                <h3 className="text-lg font-semibold">{t('myPlan.usageThisMonth')}</h3>
              </div>

              {/* Parts Usage */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{t('myPlan.parts')}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageStats?.parts_this_month || 0} / {subscription?.max_parts_per_month || '∞'}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usageStats?.parts_this_month || 0, subscription?.max_parts_per_month || null)}
                  className={cn(
                    "h-2",
                    isAtLimit(usageStats?.parts_this_month || 0, subscription?.max_parts_per_month || null) && "[&>div]:bg-destructive"
                  )}
                />
                {isAtLimit(usageStats?.parts_this_month || 0, subscription?.max_parts_per_month || null) && (
                  <Alert variant="default" className="mt-2 bg-yellow-500/10 border-yellow-500/20">
                    <AlertDescription className="text-sm">
                      {t('myPlan.partsLimitReached')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Jobs Usage */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{t('myPlan.totalJobs')}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageStats?.total_jobs || 0} {subscription?.max_jobs && `/ ${subscription.max_jobs}`}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usageStats?.total_jobs || 0, subscription?.max_jobs || null)}
                  className={cn(
                    "h-2",
                    isAtLimit(usageStats?.total_jobs || 0, subscription?.max_jobs || null) && "[&>div]:bg-destructive"
                  )}
                />
              </div>

              {/* Storage Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <CloudUpload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{t('myPlan.storage')}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {(subscription?.current_storage_gb || 0).toFixed(2)} GB / {subscription?.max_storage_gb || '∞'} GB
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription?.current_storage_gb || 0, subscription?.max_storage_gb || null)}
                  className={cn(
                    "h-2",
                    isAtLimit(subscription?.current_storage_gb || 0, subscription?.max_storage_gb || null) && "[&>div]:bg-destructive"
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{usageStats?.active_jobs || 0}</div>
                <div className="text-xs text-muted-foreground">{t('myPlan.activeJobs')}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{usageStats?.completed_jobs || 0}</div>
                <div className="text-xs text-muted-foreground">{t('myPlan.completedJobs')}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-cyan-500">{usageStats?.total_operators || 0}</div>
                <div className="text-xs text-muted-foreground">{t('myPlan.operators')}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">{usageStats?.total_admins || 0}</div>
                <div className="text-xs text-muted-foreground">{t('myPlan.admins')}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Plan Features & Upgrade Options */}
        <div className="space-y-4">
          {/* Current Plan Features */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('myPlan.planFeatures')}</h3>
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

          {/* Stripe Billing Section (Coming Soon / Admin Only) */}
          <StripeBillingSection
            currentPlan={currentPlan}
            tenantId={subscription?.tenant_id || ''}
            billingEnabled={false}
          />

          {/* Upgrade Info */}
          {currentPlan !== 'premium' && (
            <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-5 w-5 text-foreground/80" />
                  <h3 className="text-lg font-semibold">{t('myPlan.readyToUpgrade')}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentPlan === 'free'
                    ? t('myPlan.upgradeFromFree')
                    : t('myPlan.upgradeFromPro')}
                </p>
                <Separator className="my-4 bg-border-subtle" />
                <p className="text-xs text-muted-foreground mb-4">
                  {t('myPlan.contactToUpgrade')}
                </p>
                <Button
                  className="w-full"
                  onClick={() => handleUpgradeRequest(currentPlan === 'free' ? 'Pro' : 'Premium')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('myPlan.requestUpgrade')}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {t('myPlan.noSalesCalls')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Security & Architecture Notice */}
      <Alert className="bg-cyan-500/10 border-cyan-500/20">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="font-semibold mb-1">
            {currentPlan === 'premium' ? t('myPlan.singleTenant') : t('myPlan.multiTenant')}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentPlan === 'premium'
              ? t('myPlan.singleTenantDescription')
              : t('myPlan.multiTenantDescription')}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
