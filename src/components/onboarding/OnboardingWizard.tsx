import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PlanSelection, PlanType } from './PlanSelection';
import { MockDataImport } from './MockDataImport';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const steps = [
  { id: 1, name: 'Choose Plan', description: 'Select your subscription' },
  { id: 2, name: 'Sample Data', description: 'Import demo content' },
  { id: 3, name: 'Complete', description: 'Start using Eryxon' },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load existing onboarding state
  useEffect(() => {
    if (profile?.onboarding_step) {
      setCurrentStep(profile.onboarding_step);
    }
    if (profile?.plan_type) {
      setSelectedPlan(profile.plan_type as PlanType);
    }
  }, [profile]);

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

  const handlePlanSelect = async (plan: PlanType) => {
    setSelectedPlan(plan);
    await updateOnboardingProgress(2, { plan_type: plan });
    setCurrentStep(2);
  };

  const handleMockDataComplete = async () => {
    await updateOnboardingProgress(3, {
      mock_data_imported: true,
      onboarding_completed: true,
    });
    completeOnboarding();
  };

  const handleMockDataSkip = async () => {
    await updateOnboardingProgress(3, {
      mock_data_imported: false,
      onboarding_completed: true,
    });
    completeOnboarding();
  };

  const completeOnboarding = () => {
    toast.success('Onboarding complete! Welcome to Eryxon MES 🎉');

    // Navigate based on user role
    if (profile?.role === 'admin') {
      navigate('/dashboard');
    } else {
      navigate('/work-queue');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Welcome to Eryxon MES
          </h1>
          <p className="text-xl text-muted-foreground">
            The simple, elegant manufacturing execution system for metals fabrication
          </p>
        </div>

        {/* Progress Stepper */}
        <nav aria-label="Progress" className="mb-12">
          <ol className="flex items-center justify-center max-w-3xl mx-auto">
            {steps.map((step, stepIdx) => (
              <li
                key={step.id}
                className={`relative ${
                  stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''
                }`}
              >
                {/* Connector Line */}
                {stepIdx !== steps.length - 1 && (
                  <div
                    className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full ${
                        currentStep > step.id
                          ? 'bg-primary'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  </div>
                )}

                {/* Step Circle */}
                <div className="group relative flex items-center">
                  <span className="flex h-9 items-center">
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                        currentStep > step.id
                          ? 'bg-primary'
                          : currentStep === step.id
                          ? 'bg-primary border-2 border-primary'
                          : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            currentStep === step.id
                              ? 'bg-white'
                              : 'bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-500'
                          }`}
                        />
                      )}
                    </span>
                  </span>
                  <span className="ml-4 flex min-w-0 flex-col">
                    <span
                      className={`text-sm font-medium ${
                        currentStep >= step.id
                          ? 'text-primary'
                          : 'text-gray-500 dark:text-gray-400'
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
        <Card className="max-w-6xl mx-auto border-2">
          <CardContent className="p-8 sm:p-12">
            {currentStep === 1 && (
              <PlanSelection onPlanSelect={handlePlanSelect} defaultPlan={selectedPlan} />
            )}
            {currentStep === 2 && (
              <MockDataImport onComplete={handleMockDataComplete} onSkip={handleMockDataSkip} />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Need help? Check out our{' '}
            <a href="/api-docs" className="text-primary hover:underline">
              documentation
            </a>{' '}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
