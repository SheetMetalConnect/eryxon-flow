import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PlanSelection, PlanType } from './PlanSelection';
import { MockDataImport } from './MockDataImport';
import { TeamSetup } from './TeamSetup';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import AnimatedBackground from '@/components/AnimatedBackground';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { subscription } = useSubscription();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [isUpdating, setIsUpdating] = useState(false);

  const steps = [
    { id: 1, name: t('onboarding.stepBuildTeam'), description: t('onboarding.stepBuildTeamDesc') },
    { id: 2, name: t('onboarding.stepChoosePlan'), description: t('onboarding.stepChoosePlanDesc') },
    { id: 3, name: t('onboarding.stepSampleData'), description: t('onboarding.stepSampleDataDesc') },
    { id: 4, name: t('onboarding.stepComplete'), description: t('onboarding.stepCompleteDesc') },
  ];

  // Load existing onboarding state
  useEffect(() => {
    if ((profile as any)?.onboarding_step) {
      setCurrentStep((profile as any).onboarding_step);
    }
    if (subscription?.plan) {
      setSelectedPlan(subscription.plan);
    }
  }, [profile, subscription]);

  const updateOnboardingProgress = async (step: number, additionalData?: Record<string, any>) => {
    if (!profile?.id) return;

    setIsUpdating(true);
    try {
      const updates = {
        onboarding_step: step,
        ...additionalData,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTeamSetupComplete = async () => {
    await updateOnboardingProgress(2);
    setCurrentStep(2);
  };

  const handleTeamSetupSkip = async () => {
    await updateOnboardingProgress(2);
    setCurrentStep(2);
  };

  const handlePlanSelect = async (plan: PlanType) => {
    setSelectedPlan(plan);

    // Update tenant plan (not profile)
    if (profile?.tenant_id) {
      try {
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({ plan })
          .eq('id', profile.tenant_id);

        if (tenantError) {
          console.error('Error updating tenant plan:', tenantError);
          toast.error('Failed to update plan');
          return;
        }
      } catch (error) {
        console.error('Error updating tenant plan:', error);
        toast.error('Failed to update plan');
        return;
      }
    }

    await updateOnboardingProgress(3);
    setCurrentStep(3);
  };

  const handleMockDataComplete = async () => {
    await updateOnboardingProgress(4, {
      mock_data_imported: true,
      onboarding_completed: true,
    });
    completeOnboarding();
  };

  const handleMockDataSkip = async () => {
    await updateOnboardingProgress(4, {
      mock_data_imported: false,
      onboarding_completed: true,
    });
    completeOnboarding();
  };

  const completeOnboarding = () => {
    toast.success(t('onboarding.onboardingComplete'));

    // Navigate based on user role
    if (profile?.role === 'admin') {
      navigate('/dashboard');
    } else {
      navigate('/work-queue');
    }
  };

  return (
    <>
      <AnimatedBackground />

      <div className="relative min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
              {t('onboarding.gettingStarted')}
            </p>
            <h1 className="hero-title text-4xl mb-3">
              {t('onboarding.welcome')}
            </h1>
            <p className="text-lg text-foreground/80">
              {t('onboarding.tagline')}
            </p>
          </div>

        {/* Progress Stepper */}
        <nav aria-label="Progress" className="mb-12">
          <ol className="flex items-center justify-center max-w-3xl mx-auto">
            {steps.map((step, stepIdx) => (
              <li
                key={step.id}
                className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''
                  }`}
              >
                {/* Connector Line */}
                {stepIdx !== steps.length - 1 && (
                  <div
                    className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full ${currentStep > step.id
                          ? 'bg-primary'
                          : 'bg-muted'
                        }`}
                    />
                  </div>
                )}

                {/* Step Circle */}
                <div className="group relative flex items-center">
                  <span className="flex h-9 items-center">
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${currentStep > step.id
                          ? 'bg-primary'
                          : currentStep === step.id
                            ? 'bg-primary border-2 border-primary'
                            : 'bg-card border-2 border-border'
                        }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${currentStep === step.id
                              ? 'bg-card'
                              : 'bg-transparent group-hover:bg-muted'
                            }`}
                        />
                      )}
                    </span>
                  </span>
                  <span className="ml-4 flex min-w-0 flex-col">
                    <span
                      className={`text-sm font-medium ${currentStep >= step.id
                          ? 'text-primary'
                          : 'text-muted-foreground'
                        }`}
                    >
                      {step.name}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content Area */}
        <Card className="max-w-6xl mx-auto glass-card">
          <CardContent className="p-8 sm:p-12">
            {currentStep === 1 && (
              <TeamSetup onComplete={handleTeamSetupComplete} onSkip={handleTeamSetupSkip} />
            )}
            {currentStep === 2 && (
              <PlanSelection onPlanSelect={handlePlanSelect} defaultPlan={selectedPlan} />
            )}
            {currentStep === 3 && (
              <MockDataImport onComplete={handleMockDataComplete} onSkip={handleMockDataSkip} />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            {t('onboarding.needHelp')}{' '}
            <a href="/api-docs" className="text-primary hover:underline">
              {t('onboarding.documentation')}
            </a>{' '}
            {t('onboarding.orContactSupport')}.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
