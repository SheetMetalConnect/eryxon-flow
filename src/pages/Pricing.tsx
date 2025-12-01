import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Shield, Server, Users, Zap, Star, ArrowRight, Building2, Github } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Main hosted tiers
const hostedTiers = [
  {
    id: "free",
    nameKey: "pricing.free.name",
    descriptionKey: "pricing.free.description",
    priceKey: "pricing.free.price",
    featuresKey: "pricing.free.features",
    ctaKey: "pricing.currentPlan",
    icon: Users,
    popular: false,
    gradient: false,
  },
  {
    id: "pro",
    nameKey: "pricing.pro.name",
    descriptionKey: "pricing.pro.description",
    priceKey: "pricing.pro.price",
    featuresKey: "pricing.pro.features",
    ctaKey: "pricing.upgrade",
    icon: Zap,
    popular: true,
    gradient: false,
  },
  {
    id: "premium",
    nameKey: "pricing.premium.name",
    descriptionKey: "pricing.premium.description",
    priceKey: "pricing.premium.price",
    featuresKey: "pricing.premium.features",
    ctaKey: "pricing.contactSales",
    icon: Star,
    popular: false,
    gradient: true,
  },
];

// Alternative options
const alternativeTiers = [
  {
    id: "enterprise",
    nameKey: "pricing.enterprise.name",
    descriptionKey: "pricing.enterprise.description",
    priceKey: "pricing.enterprise.price",
    featuresKey: "pricing.enterprise.features",
    ctaKey: "pricing.enterprise.cta",
    icon: Building2,
  },
  {
    id: "selfHosted",
    nameKey: "pricing.selfHosted.name",
    descriptionKey: "pricing.selfHosted.description",
    priceKey: "pricing.selfHosted.price",
    featuresKey: "pricing.selfHosted.features",
    ctaKey: "pricing.selfHosted.cta",
    noteKey: "pricing.selfHosted.note",
    icon: Github,
    isGithub: true,
  },
];

export default function Pricing() {
  const { t } = useTranslation();
  const { subscription, getPlanDisplayName } = useSubscription();
  const currentPlan = subscription?.plan || 'free';

  const handleUpgradeRequest = (tierName: string) => {
    const subject = `Upgrade Request: ${tierName} Plan`;
    const body = `Hello,

I would like to request an upgrade to the ${tierName} plan.

Current Plan: ${getPlanDisplayName(currentPlan)}
Tenant ID: ${subscription?.tenant_id || 'N/A'}

Please provide me with more information about the upgrade process.

Thank you!`;

    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleEnterpriseRequest = () => {
    const subject = "Enterprise Inquiry";
    const body = `Hello,

I'm interested in the Enterprise plan for Eryxon Flow.

Current Plan: ${getPlanDisplayName(currentPlan)}
Tenant ID: ${subscription?.tenant_id || 'N/A'}

I would like to discuss:
- Single-tenant deployment options
- Custom requirements
- Pricing

Please get in touch to discuss further.

Thank you!`;

    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const isCurrentPlan = (tierId: string) => tierId === currentPlan;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t("pricing.title")}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t("pricing.subtitle")}
        </p>
        {subscription && (
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-sm py-1 px-3">
              {t("pricing.currentPlan")}: {getPlanDisplayName(currentPlan)}
            </Badge>
            <Link to="/my-plan">
              <Button variant="link" size="sm" className="gap-1">
                {t("navigation.myPlan")} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Section 1: Hosted Plans */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{t("pricing.hostedPlans")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("pricing.hostedPlansDescription")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {hostedTiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = isCurrentPlan(tier.id);

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${isCurrent ? 'border-success shadow-xl ring-2 ring-success/20' : ''
                  } ${tier.popular && !isCurrent ? 'border-primary shadow-lg' : ''} ${tier.gradient ? 'border-primary' : ''
                  }`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-success-foreground">
                    {t("pricing.currentPlan")}
                  </Badge>
                )}
                {tier.popular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    {t("onboarding.mostPopular")}
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tier.gradient
                        ? 'bg-gradient-to-br from-primary to-accent'
                        : isCurrent
                          ? 'bg-alert-success-bg'
                          : 'bg-primary/10'
                      }`}>
                      <Icon className={`h-6 w-6 ${tier.gradient ? 'text-primary-foreground' : isCurrent ? 'text-success' : 'text-primary'
                        }`} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{t(tier.nameKey)}</CardTitle>
                      <CardDescription>{t(tier.descriptionKey)}</CardDescription>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{t(tier.priceKey)}</span>
                      <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {(t(tier.featuresKey, { returnObjects: true }) as string[]).map((feature, index) => {
                      const isNegative = feature.toLowerCase().startsWith('no ') ||
                                        feature.toLowerCase().startsWith('geen ') ||
                                        feature.toLowerCase().startsWith('kein');
                      return (
                        <li key={index} className="flex items-start gap-2">
                          {isNegative ? (
                            <X className="h-5 w-5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                          ) : (
                            <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isCurrent ? 'text-success' : 'text-primary'}`} />
                          )}
                          <span className={`text-sm ${isNegative ? 'text-muted-foreground' : ''}`}>{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrent ? (
                    <Link to="/my-plan" className="w-full">
                      <Button
                        className="w-full"
                        variant="outline"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        {t("pricing.managePlan")}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      variant={tier.popular ? 'default' : 'outline'}
                      onClick={() => handleUpgradeRequest(t(tier.nameKey))}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {t(tier.ctaKey)}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Section 2: Alternatives */}
      <div className="space-y-4 pt-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{t("pricing.alternatives")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("pricing.alternativesDescription")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {alternativeTiers.map((tier) => {
            const Icon = tier.icon;

            return (
              <Card key={tier.id} className="flex flex-col border-dashed">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t(tier.nameKey)}</CardTitle>
                      <CardDescription>{t(tier.descriptionKey)}</CardDescription>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{t(tier.priceKey)}</span>
                      {tier.id !== 'enterprise' && (
                        <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {(t(tier.featuresKey, { returnObjects: true }) as string[]).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.noteKey && (
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      {t(tier.noteKey)}
                    </p>
                  )}
                </CardContent>

                <CardFooter>
                  {tier.isGithub ? (
                    <a
                      href="https://github.com/SheetMetalConnect/eryxon-flow"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full" variant="outline">
                        <Github className="h-4 w-4 mr-2" />
                        {t(tier.ctaKey)}
                      </Button>
                    </a>
                  ) : (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleEnterpriseRequest}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {t(tier.ctaKey)}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Security Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">{t("pricing.securityBanner.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("pricing.securityBanner.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pricing.howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.selfServiceTitle")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.selfServiceDescription")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.upgradeTitle")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.upgradeDescription")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.usageTitle")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.usageDescription")}{' '}
              <Link to="/my-plan" className="text-primary hover:underline">
                {t("navigation.myPlan")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Why Hosted */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Server className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">{t("pricing.whyHosted.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("pricing.whyHosted.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
