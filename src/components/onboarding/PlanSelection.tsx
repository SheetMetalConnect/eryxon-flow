import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type PlanType = 'free' | 'pro';

interface PlanSelectionProps {
  onPlanSelect: (plan: PlanType) => void;
  defaultPlan?: PlanType;
}

interface Plan {
  type: PlanType;
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    type: 'free',
    name: 'Free Plan',
    price: '$0',
    description: 'Perfect for getting started with Eryxon MES',
    badge: 'Best for Small Teams',
    features: [
      'Up to 5 operators',
      'Unlimited jobs and parts tracking',
      'Real-time work queue',
      'Basic time tracking',
      'Mobile-friendly interface',
      'STEP and PDF file viewers',
      'Issue reporting',
      'Email support',
    ],
    recommended: true,
  },
  {
    type: 'pro',
    name: 'Pro Plan',
    price: '$49',
    description: 'Advanced features for growing metal fabrication shops',
    badge: 'Most Popular',
    features: [
      'Everything in Free, plus:',
      'Unlimited operators',
      'Advanced analytics and reporting',
      'Custom fields and metadata',
      'API access and webhooks',
      'Multi-tenant management',
      'Priority support',
      'Custom integrations',
      'Advanced QRM metrics',
    ],
  },
];

export function PlanSelection({ onPlanSelect, defaultPlan = 'free' }: PlanSelectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(defaultPlan);

  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    onPlanSelect(selectedPlan);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Choose Your Plan</h2>
        <p className="text-muted-foreground text-lg">
          Start with our free plan and upgrade anytime as your shop grows
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
                {plan.type === 'pro' && (
                  <span className="text-muted-foreground">/month</span>
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

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={handleContinue} className="min-w-[200px]">
          Continue with {selectedPlan === 'free' ? 'Free' : 'Pro'} Plan
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>No credit card required for Free plan • Cancel anytime • 30-day money-back guarantee</p>
      </div>
    </div>
  );
}
