import { Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type PlanType = 'free' | 'pro' | 'premium' | 'enterprise' | 'self_hosted';

interface PlanSelectionProps {
  onPlanSelect: (plan: PlanType) => void;
  onSkip?: () => void;
  defaultPlan?: PlanType;
}

export function PlanSelection({ onPlanSelect, onSkip }: PlanSelectionProps) {
  const { t } = useTranslation();

  const handleContinue = () => {
    // Always select free plan for now
    onPlanSelect('free');
  };

  const handleContactUs = () => {
    window.open('https://github.com/SheetMetalConnect/eryxon-flow/issues', '_blank');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('onboarding.planSelection.title')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('onboarding.planSelection.comingSoon')}
        </p>
      </div>

      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-8 text-center">
          <Clock className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h3 className="text-2xl font-bold mb-3">{t('pricing.comingSoonTitle')}</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {t('pricing.comingSoonDescription')}
          </p>
          <Button size="lg" onClick={handleContactUs} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('pricing.contactUs')}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3 pt-4">
        <Button size="lg" onClick={handleContinue} className="min-w-[200px]">
          {t('onboarding.planSelection.continue')}
        </Button>
        {onSkip && (
          <Button size="lg" variant="outline" onClick={onSkip}>
            {t('onboarding.planSelection.skip')}
          </Button>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>{t('onboarding.planSelection.freeForNow')}</p>
      </div>
    </div>
  );
}
