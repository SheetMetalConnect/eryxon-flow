import { useEffect, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface TenantOnboardingProps {
  onComplete?: () => void;
}

export function TenantOnboarding({ onComplete }: TenantOnboardingProps) {
  const { t } = useTranslation();
  const { profile, tenant, refreshTenant } = useAuth();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!profile?.tenant_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('onboarding_completed_at')
          .eq('id', profile.tenant_id)
          .single();

        if (error) throw error;

        setOnboardingCompleted(data?.onboarding_completed_at !== null);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(true); // Assume completed on error to not block
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [profile?.tenant_id]);

  // Start tour when on dashboard and onboarding not completed
  useEffect(() => {
    if (
      !loading &&
      onboardingCompleted === false &&
      location.pathname === '/admin/dashboard'
    ) {
      const timer = setTimeout(() => {
        setRun(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, onboardingCompleted, location.pathname]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('onboarding.tenant.welcomeTitle')}</h3>
          <p>{t('onboarding.tenant.welcomeDescription')}</p>
          <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary">
              {t('onboarding.tenant.trialNotice')}
            </p>
          </div>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="setup-banner"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">{t('onboarding.tenant.demoDataTitle')}</h3>
          <p>{t('onboarding.tenant.demoDataDescription')}</p>
        </div>
      ),
      placement: 'bottom',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="config-nav"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">{t('onboarding.tenant.configTitle')}</h3>
          <p>{t('onboarding.tenant.configDescription')}</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('onboarding.tenant.readyTitle')}</h3>
          <p>{t('onboarding.tenant.readyDescription')}</p>
          <div className="mt-3 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t('onboarding.tenant.supportNote')}
            </p>
          </div>
        </div>
      ),
      placement: 'center',
    },
  ];

  const markOnboardingComplete = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', profile.tenant_id);

      if (error) throw error;

      setOnboardingCompleted(true);
      await refreshTenant();
      toast.success(t('onboarding.tenant.completed'));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(t('common.error'));
    }
  }, [profile?.tenant_id, refreshTenant, t]);

  const handleJoyrideCallback = useCallback(
    async (data: CallBackProps) => {
      const { status, type, action, index } = data;
      const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

      if (finishedStatuses.includes(status)) {
        setRun(false);
        await markOnboardingComplete();
        onComplete?.();
      } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
      }
    },
    [markOnboardingComplete, onComplete]
  );

  // Don't render if loading, already completed, or not on dashboard
  if (loading || onboardingCompleted !== false) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.7)',
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
        },
        tooltipContent: {
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 500,
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 10,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
        spotlight: {
          borderRadius: 8,
        },
      }}
      locale={{
        back: t('common.back'),
        close: t('common.close'),
        last: t('onboarding.tenant.getStarted'),
        next: t('common.next'),
        skip: t('onboarding.tenant.skipTour'),
      }}
    />
  );
}

// Hook to manually restart tenant onboarding
export function useRestartTenantOnboarding() {
  const { profile, refreshTenant } = useAuth();
  const { t } = useTranslation();

  const restartOnboarding = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      await supabase
        .from('tenants')
        .update({ onboarding_completed_at: null })
        .eq('id', profile.tenant_id);

      await refreshTenant();
      toast.success(t('onboarding.tenant.reset'));
      window.location.reload();
    } catch (error) {
      console.error('Error restarting onboarding:', error);
      toast.error(t('common.error'));
    }
  }, [profile?.tenant_id, refreshTenant, t]);

  return { restartOnboarding };
}
