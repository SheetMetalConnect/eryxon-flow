import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, Rocket, UserPlus, ClipboardList, MonitorSmartphone, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { usePilotActivation } from '@/hooks/usePilotActivation';

interface StepDef {
  id: number;
  done: boolean;
  icon: typeof UserPlus;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  to: string;
}

/**
 * Guided "managed pilot" activation path (ERY-36).
 *
 * Renders a compact checklist that walks a fresh admin from a single-admin demo
 * tenant to first assigned operator work:
 *   1. Add a teammate or no-email operator
 *   2. Assign an operation
 *   3. Have the operator pick the work up
 *
 * Each step deep-links to the existing surface that completes it. Once the
 * tenant is pilot-ready (an operator has assigned work) the card collapses to a
 * dismissible success banner so it stays out of the way on the live dashboard.
 */
export function PilotActivationCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const { loading, hasOperator, hasPendingInvite, hasAssignment, pilotReady, refetch } =
    usePilotActivation();

  const dismissKey = profile?.tenant_id ? `pilot-activation-dismissed:${profile.tenant_id}` : null;
  const [dismissed, setDismissed] = useState(() =>
    dismissKey ? localStorage.getItem(dismissKey) === '1' : false,
  );

  // Hide while we don't know the state, or once an admin dismissed the ready banner.
  if (loading || !profile?.tenant_id) return null;
  if (pilotReady && dismissed) return null;

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  const steps: StepDef[] = [
    {
      id: 1,
      done: hasOperator || hasPendingInvite,
      icon: UserPlus,
      titleKey: 'pilotActivation.step1Title',
      descKey: 'pilotActivation.step1Desc',
      ctaKey: 'pilotActivation.step1Cta',
      to: '/admin/config/users',
    },
    {
      id: 2,
      done: hasAssignment,
      icon: ClipboardList,
      titleKey: 'pilotActivation.step2Title',
      descKey: 'pilotActivation.step2Desc',
      ctaKey: 'pilotActivation.step2Cta',
      to: '/admin/assignments',
    },
    {
      id: 3,
      done: pilotReady,
      icon: MonitorSmartphone,
      titleKey: 'pilotActivation.step3Title',
      descKey: 'pilotActivation.step3Desc',
      ctaKey: 'pilotActivation.step3Cta',
      to: '/operator/login',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <Card className={pilotReady ? 'glass-card border-success/30' : 'glass-card border-primary/20'}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className={`h-5 w-5 ${pilotReady ? 'text-success' : 'text-primary'}`} />
            {pilotReady ? t('pilotActivation.readyTitle') : t('pilotActivation.title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {pilotReady
              ? t('pilotActivation.readyDescription')
              : t('pilotActivation.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {t('pilotActivation.progress', { completed: completedCount, total: steps.length })}
          </Badge>
          {pilotReady && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleDismiss}
              aria-label={t('common.dismiss', 'Dismiss')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-muted/10 p-3"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  step.done
                    ? 'bg-success/20 text-success'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {step.done ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.done ? 'text-muted-foreground line-through' : ''
                  }`}
                >
                  {step.id}. {t(step.titleKey)}
                </p>
                <p className="text-xs text-muted-foreground">{t(step.descKey)}</p>
              </div>
              {!step.done && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 whitespace-nowrap"
                  onClick={() => navigate(step.to)}
                >
                  {t(step.ctaKey)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}

        {!pilotReady && (
          <div className="pt-1 text-right">
            <Button variant="ghost" size="sm" className="text-xs" onClick={refetch}>
              {t('pilotActivation.refresh')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
