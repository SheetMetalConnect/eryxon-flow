import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, Shield, Server, Users, Zap, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";

const pricingTiers = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    features: [
      "All features included",
      "Up to 100 jobs per month",
      "Up to 1,000 parts per month",
      "5 GB storage",
      "Limited API access",
      "Multi-tenant architecture",
      "HTTPS traffic only",
      "Email support",
      "Documentation access",
    ],
    cta: "Current Plan",
    icon: Users,
    popular: false,
    gradient: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing manufacturing teams",
    price: "$97",
    period: "month",
    features: [
      "Unlimited users",
      "Up to 1,000 jobs per month",
      "Up to 10,000 parts per month",
      "50 GB storage",
      "Full API access",
      "Storage upgrade options",
      "Multi-tenant architecture",
      "Row-level security",
      "Priority email support",
      "Webhook integrations",
    ],
    cta: "Request Upgrade",
    icon: Zap,
    popular: true,
    gradient: false,
  },
  {
    id: "premium",
    name: "Enterprise",
    description: "Custom, bespoke solution",
    price: "Starting at $497",
    period: "month",
    features: [
      "Everything in Pro",
      "Unlimited jobs & parts",
      "Unlimited storage",
      "Unlimited usage",
      "Self-hosted (on-premises)",
      "Single-tenant deployment",
      "Completely air-gapped",
      "SSO integration",
      "Dedicated infrastructure",
      "Premium support",
      "Custom SLA",
      "White-label options",
    ],
    cta: "Contact Sales",
    icon: Server,
    popular: false,
    gradient: true,
  },
];

export default function Pricing() {
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Self-service pricing designed for manufacturers. No sales calls, no consultants.
            Sign up and go.
          </p>
          {subscription && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-sm py-1 px-3">
                Current Plan: {getPlanDisplayName(currentPlan)}
              </Badge>
              <Link to="/my-plan">
                <Button variant="link" size="sm" className="gap-1">
                  View My Plan <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Security Banner */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold">Enterprise-Grade Security</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Free & Pro:</strong> Multi-tenant architecture with complete data isolation per tenant.
                  Row-level security enforces separation at the database level.
                  {" "}
                  <strong>Premium:</strong> Single-tenant deployment with dedicated infrastructure, completely air-gapped.
                  {" "}
                  All tiers include HTTPS traffic only, hashed passwords, encrypted API keys, and time-limited file access via signed URLs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = isCurrentPlan(tier.id);

            return (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${
                  isCurrent ? 'border-green-500 shadow-xl ring-2 ring-green-500/20' : ''
                } ${tier.popular && !isCurrent ? 'border-primary shadow-lg' : ''} ${
                  tier.gradient ? 'border-purple-500' : ''
                }`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                    Current Plan
                  </Badge>
                )}
                {tier.popular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tier.gradient
                        ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                        : isCurrent
                        ? 'bg-green-500/10'
                        : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        tier.gradient ? 'text-white' : isCurrent ? 'text-green-600' : 'text-primary'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      {tier.period && (
                        <span className="text-muted-foreground text-sm">/ {tier.period}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          isCurrent ? 'text-green-600' : 'text-primary'
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
                      onClick={() => handleUpgradeRequest(tier.name)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {tier.cta}
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
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Self-Service Only</h4>
              <p className="text-sm text-muted-foreground">
                No onboarding calls. No consultants. No phone support. Sign up, configure your stages
                and materials, connect your API, and go. Documentation and email support only.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">How to Upgrade</h4>
              <p className="text-sm text-muted-foreground">
                Ready to upgrade? Click the "Request Upgrade" or "Contact Sales" button above to send
                an email to <a href="mailto:office@sheetmetalconnect.com" className="text-primary hover:underline">
                  office@sheetmetalconnect.com
                </a>. We'll get back to you with next steps.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Usage Tracking & Plan Management</h4>
              <p className="text-sm text-muted-foreground">
                Monitor your usage, track jobs and parts count, and manage your subscription from your{' '}
                <Link to="/my-plan" className="text-primary hover:underline">My Plan</Link> page.
                You'll see real-time usage statistics and receive alerts when approaching tier limits.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
