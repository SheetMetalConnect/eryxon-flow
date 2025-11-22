import { useEffect, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppTourProps {
  userRole: 'admin' | 'operator';
  onComplete?: () => void;
}

export function AppTour({ userRole, onComplete }: AppTourProps) {
  const { profile } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Admin tour steps
  const adminSteps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Welcome to Eryxon MES! 👋</h3>
          <p>
            This is your <strong>Admin Dashboard</strong> for managing your metal fabrication shop.
            Let's take a quick tour of the key features.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Navigation Sidebar</h3>
          <p>
            Access all admin functions from here: Dashboard, Jobs, Parts, Issues, Assignments, and
            Configuration.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="dashboard-stats"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Real-time Metrics</h3>
          <p>
            Monitor active jobs, parts in progress, ongoing operations, and reported issues at a
            glance.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="active-operations"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Active Operations</h3>
          <p>See what operators are currently working on in real-time. Track progress by cell/stage.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="jobs-nav"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Jobs Management</h3>
          <p>
            Create and manage customer jobs. Each job contains parts that flow through your
            manufacturing cells.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="config-nav"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Configuration</h3>
          <p>
            Set up your shop: add operators, define manufacturing cells/stages, configure API
            integrations, and customize workflows.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">You're All Set! 🎉</h3>
          <p>
            Eryxon MES organizes work by <strong>manufacturing stages</strong> (cutting, bending,
            welding, etc.) using <strong>Quick Response Manufacturing (QRM)</strong> principles.
          </p>
          <p className="mt-2">
            Operators pull work when ready, and you get real-time visibility into the shop floor
            without walking around.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore the sample data or start creating your own jobs!
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  // Operator tour steps
  const operatorSteps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Welcome to Eryxon MES! 👋</h3>
          <p>
            This is your <strong>Work Queue</strong> - your mobile-first interface for tracking
            manufacturing tasks. Let's show you around!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="work-queue"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Your Work Queue</h3>
          <p>
            All operations assigned to you appear here, organized by manufacturing stage (cutting,
            bending, welding, etc.).
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="operation-card"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Operation Cards</h3>
          <p>
            Each card shows the part, operation details, and status. Tap a card to see drawings,
            STEP files, and custom instructions.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="start-timer"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Time Tracking</h3>
          <p>
            Tap <strong>Start</strong> when you begin work and <strong>Stop</strong> when done.
            Simple, visual, and accurate time tracking.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="bottom-nav"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Bottom Navigation</h3>
          <p>
            Quickly switch between your <strong>Work Queue</strong>, <strong>My Activity</strong>{' '}
            (time entries), and <strong>Issues</strong> you've reported.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Ready to Work! 🔧</h3>
          <p>
            Eryxon shows you what to work on, grouped by materials and stages - organized the way
            your shop runs.
          </p>
          <p className="mt-2">
            Visual indicators (colors, images) make tasks instantly recognizable. Everything you
            need, nothing extra.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start by selecting an operation from your queue!
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const steps = userRole === 'admin' ? adminSteps : operatorSteps;

  useEffect(() => {
    // Start tour automatically when component mounts
    const timer = setTimeout(() => {
      setRun(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleJoyrideCallback = useCallback(
    async (data: CallBackProps) => {
      const { status, type, action, index } = data;
      const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

      if (finishedStatuses.includes(status)) {
        setRun(false);

        // Mark tour as completed in database
        if (profile?.id) {
          try {
            await supabase
              .from('profiles')
              .update({ tour_completed: true })
              .eq('id', profile.id);

            toast.success('Tour completed! You can restart it anytime from settings.');
          } catch (error) {
            console.error('Error updating tour completion:', error);
          }
        }

        onComplete?.();
      } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        // Move to next step
        setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
      }
    },
    [profile, onComplete]
  );

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
          primaryColor: '#1e90ff', // Brand primary (Dodger Blue)
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: 'hsl(0 0% 8% / 0.95)', // Glass background
          borderRadius: 12,
          padding: 24,
          border: '1px solid hsl(0 0% 100% / 0.1)', // Glass border
        },
        tooltipContent: {
          padding: 0,
        },
        buttonNext: {
          backgroundColor: '#1e90ff', // Brand primary
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 500,
        },
        buttonBack: {
          color: 'hsl(0 0% 60%)',
          marginRight: 12,
        },
        buttonSkip: {
          color: 'hsl(0 0% 60%)',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}

// Hook to restart the tour
export function useRestartTour() {
  const { profile } = useAuth();

  const restartTour = useCallback(async () => {
    if (!profile?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ tour_completed: false })
        .eq('id', profile.id);

      toast.success('Tour reset! Refresh the page to start the tour again.');

      // Reload to restart tour
      window.location.reload();
    } catch (error) {
      console.error('Error restarting tour:', error);
      toast.error('Failed to restart tour');
    }
  }, [profile]);

  return { restartTour };
}
