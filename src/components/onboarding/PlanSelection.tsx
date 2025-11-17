import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type PlanType = 'free' | 'pro' | 'premium';

interface PlanSelectionProps {
  onPlanSelect: (plan: PlanType) => void;
  onSkip?: () => void;
  defaultPlan?: PlanType;
}

interface Plan {
  type: PlanType;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  recommended?: boolean;
  badge?: string;
  requiresContact?: boolean;
}

const plans: Plan[] = [
  {
    type: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    badge: 'Current Plan',
    features: [
      'All features included',
      'Up to 100 jobs per month',
      'Up to 1,000 parts per month',
      'Limited storage',
      'Multi-tenant architecture',
      'HTTPS traffic only',
      'Email support',
      'Documentation access',
    ],
    recommended: true,
  },
  {
    type: 'pro',
    name: 'Pro',
    price: 'Contact Us',
    description: 'For growing manufacturing teams',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Unlimited jobs & parts',
      'Tiered storage limits',
      'Storage upgrade options',
      'Multi-tenant architecture',
      'Row-level security',
      'Priority email support',
      'API access',
    ],
    requiresContact: true,
  },
  {
    type: 'premium',
    name: 'Premium',
    price: 'Custom',
    description: 'Enterprise-grade solution',
    features: [
      'Everything in Pro',
      'Single-tenant deployment',
      'Self-hosted option',
      'Completely air-gapped',
      'SSO integration',
      'Unlimited storage',
      'Dedicated infrastructure',
      'Premium support',
    ],
    requiresContact: true,
  },
];

export function PlanSelection({ onPlanSelect, onSkip, defaultPlan = 'free' }: PlanSelectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(defaultPlan);

  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    const selectedPlanData = plans.find(p => p.type === selectedPlan);

    if (selectedPlanData?.requiresContact) {
      // For Pro/Premium, open email to request upgrade
      const subject = `Upgrade Request: ${selectedPlanData.name} Plan`;
      const body = `Hello,

I would like to request an upgrade to the ${selectedPlanData.name} plan during onboarding.

Please provide me with more information about the upgrade process.

Thank you!`;

      window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Continue with free plan but note the request
      onPlanSelect('free');
    } else {
      onPlanSelect(selectedPlan);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Choose Your Plan</h2>
        <p className="text-muted-foreground text-lg">
          Start with our free plan and upgrade anytime as your shop grows
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.type}
            className={`relative cursor-pointer transition-all hover:shadow-lg ${
              selectedPlan === plan.type
                ? 'ring-2 ring-primary shadow-lg'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleSelectPlan(plan.type)}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant={plan.recommended ? 'default' : 'secondary'}>
                  {plan.badge}
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="pt-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground"> {plan.period}</span>
                )}
              </div>
              <CardDescription className="pt-2">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={selectedPlan === plan.type ? 'default' : 'outline'}
                className="w-full"
                onClick={() => handleSelectPlan(plan.type)}
              >
                {selectedPlan === plan.type ? 'Selected' : 'Select Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-3 pt-4">
        <Button size="lg" onClick={handleContinue} className="min-w-[200px]">
          {selectedPlan === 'free' ? 'Continue with Free Plan' : `Request ${plans.find(p => p.type === selectedPlan)?.name} Plan`}
        </Button>
        {onSkip && (
          <Button size="lg" variant="outline" onClick={onSkip}>
            Skip for Now
          </Button>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          No credit card required • Upgrade anytime
        </p>
      </div>
    </div>
  );
}
