import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, Shield, Server, Users, Zap, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const pricingTiers = [
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
    icon: Server,
    popular: false,
    gradient: true,
  },
];

export default function Pricing() {
  const { t } = useTranslation();
  const { subscription, getPlanDisplayName } = useSubscription();
  const currentPlan = subscription?.plan || 'free';

  const handleUpgradeRequest = (tierName: string) => {
    const subject = `Upgrade Request: ${tierName} Tier`;
    const body = `Hello,

I would like to request an upgrade to the ${tierName} tier.

Current Plan: ${getPlanDisplayName(currentPlan)}
Tenant ID: ${subscription?.tenant_id || 'N/A'}

Please provide me with more information about the upgrade process.

Thank you!`;

    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const isCurrentPlan = (tierId: string) => tierId === currentPlan;

  return (
    <div className="space-y-6">
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

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {pricingTiers.map((tier) => {
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
                  {(t(tier.featuresKey, { returnObjects: true }) as string[]).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isCurrent ? 'text-success' : 'text-primary'
                        }`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
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
                      Manage Plan
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

      {/* FAQ / Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pricing.howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.payments.title")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.payments.description")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.selfService.title")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.selfService.description")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.upgrade.title")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.upgrade.description")}{" "}
              <a href="mailto:office@sheetmetalconnect.com" className="text-primary hover:underline">
                office@sheetmetalconnect.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
