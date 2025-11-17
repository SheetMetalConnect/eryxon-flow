import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, Shield, Server, Users, Zap } from "lucide-react";

const pricingTiers = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    features: [
      "All features included",
      "Up to 100 jobs per month",
      "Up to 1,000 parts per month",
      "Limited storage",
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
    name: "Pro",
    description: "For growing manufacturing teams",
    price: "Contact Us",
    period: "",
    features: [
      "Everything in Free",
      "Unlimited jobs & parts",
      "Tiered storage limits",
      "Storage upgrade options",
      "Multi-tenant architecture",
      "Row-level security",
      "Priority email support",
      "API access",
    ],
    cta: "Request Upgrade",
    icon: Zap,
    popular: true,
    gradient: false,
  },
  {
    name: "Premium",
    description: "Enterprise-grade solution",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Single-tenant deployment",
      "Self-hosted option",
      "Completely air-gapped",
      "SSO integration",
      "Unlimited storage",
      "Dedicated infrastructure",
      "Premium support",
    ],
    cta: "Contact Sales",
    icon: Server,
    popular: false,
    gradient: true,
  },
];

export default function Pricing() {
  const handleUpgradeRequest = (tierName: string) => {
    const subject = `Upgrade Request: ${tierName} Tier`;
    const body = `Hello,

I would like to request an upgrade to the ${tierName} tier.

Please provide me with more information about the upgrade process.

Thank you!`;

    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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

            return (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${
                  tier.popular ? 'border-primary shadow-lg' : ''
                } ${tier.gradient ? 'border-purple-500' : ''}`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tier.gradient
                        ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                        : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        tier.gradient ? 'text-white' : 'text-primary'
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
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => handleUpgradeRequest(tier.name)}
                    disabled={tier.name === 'Free'}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {tier.cta}
                  </Button>
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
              <h4 className="font-semibold mb-2">Usage Tracking (Coming Soon)</h4>
              <p className="text-sm text-muted-foreground">
                We're building usage tracking to help you monitor your active jobs and parts count.
                You'll be notified when approaching your tier limits.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
