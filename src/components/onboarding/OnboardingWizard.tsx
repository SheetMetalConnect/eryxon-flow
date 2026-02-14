import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Users, CreditCard, Database, Rocket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PlanSelection, PlanType } from './PlanSelection';
import { MockDataImport } from './MockDataImport';
import { TeamSetup } from './TeamSetup';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '@/components/AnimatedBackground';

const STEP_ICONS = [Users, CreditCard, Database, Rocket];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { subscription } = useSubscription();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [isUpdating, setIsUpdating] = useState(false);

  const steps = [
    { id: 1, name: t('onboarding.steps.team'), description: t('onboarding.steps.teamDesc') },
    { id: 2, name: t('onboarding.steps.plan'), description: t('onboarding.steps.planDesc') },
    { id: 3, name: t('onboarding.steps.data'), description: t('onboarding.steps.dataDesc') },
    { id: 4, name: t('onboarding.steps.complete'), description: t('onboarding.steps.completeDesc') },
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
      toast.error(t('onboarding.progressSaveFailed'));
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
          .update({ plan: plan as any })
          .eq('id', profile.tenant_id);

        if (tenantError) {
          console.error('Error updating tenant plan:', tenantError);
          toast.error(t('onboarding.planUpdateFailed'));
          return;
        }
      } catch (error) {
        console.error('Error updating tenant plan:', error);
        toast.error(t('onboarding.planUpdateFailed'));
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
      navigate('/admin/dashboard');
    } else {
      navigate('/operator/work-queue');
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
              {t('onboarding.subtitle')}
            </p>
          </div>

          {/* Premium Stepper */}
          <nav aria-label="Progress" className="mb-12">
            <div className="onboarding-stepper">
              {steps.map((step, stepIdx) => {
                const StepIcon = STEP_ICONS[stepIdx];
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                const stateClass = isCompleted ? 'completed' : isActive ? 'active' : 'pending';

                return (
                  <div key={step.id} className="onboarding-stepper-step">
                    {/* Connector line before (except first) */}
                    {stepIdx > 0 && (
                      <div
                        className={`onboarding-stepper-line ${isCompleted || isActive ? 'completed' : 'pending'}`}
                      />
                    )}

                    {/* Step circle */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`onboarding-stepper-circle ${stateClass}`}>
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="text-center">
                        <span
                          className={`text-xs font-medium block ${
                            isCompleted || isActive ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {step.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                          {step.description}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
              {t('onboarding.orContactSupport')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
