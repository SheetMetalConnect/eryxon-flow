import { useState, useCallback } from 'react';
import {
  Package,
  Wrench,
  CheckCircle2,
  Factory,
  FileBox,
  ClipboardList,
  RotateCw,
  Loader2,
  Database,
  Check,
  Users,
  Calendar,
  Link2,
  Clock,
  BarChart3,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateMockData, clearMockData } from '@/lib/mockDataGenerator';
import type { MockDataProgressStep } from '@/lib/mockDataGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface MockDataImportProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PROGRESS_STEP_ICONS: Record<string, React.ElementType> = {
  cells: Factory,
  calendar: Calendar,
  operators: Users,
  resources: Wrench,
  jobs: FileBox,
  parts: Package,
  operations: ClipboardList,
  resourceLinks: Link2,
  timeEntries: Clock,
  quantities: BarChart3,
  issues: AlertTriangle,
};

export function MockDataImport({ onComplete, onSkip }: MockDataImportProps) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<MockDataProgressStep | null>(null);

  const handleProgress = useCallback((step: MockDataProgressStep) => {
    setProgress(step);
  }, []);

  const handleImport = async () => {
    if (!profile?.tenant_id) {
      toast.error(t('onboarding.progressSteps.tenantNotFound'));
      return;
    }

    setIsImporting(true);
    setProgress(null);

    try {
      const result = await generateMockData(profile.tenant_id, {
        includeCells: true,
        includeJobs: true,
        includeParts: true,
        includeOperations: true,
        onProgress: handleProgress,
      });

      if (result.success) {
        setProgress({ step: 11, totalSteps: 11, label: 'complete', percentage: 100 });
        setImportComplete(true);
        toast.success(t('onboarding.sampleDataImported'));
      } else {
        toast.error(`${t('onboarding.progressSteps.importFailed')}: ${result.error}`);
        setProgress(null);
      }
    } catch (error) {
      console.error('Error importing mock data:', error);
      toast.error(t('onboarding.progressSteps.unexpectedError'));
      setProgress(null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAndReimport = async () => {
    if (!profile?.tenant_id) return;

    setIsClearing(true);
    setProgress(null);

    try {
      const clearResult = await clearMockData(profile.tenant_id);
      if (!clearResult.success) {
        toast.error(`${t('onboarding.progressSteps.clearFailed')}: ${clearResult.error}`);
        setIsClearing(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setImportComplete(false);
      await handleImport();
    } catch (error) {
      console.error('Error clearing and reimporting:', error);
      toast.error(t('onboarding.progressSteps.resetFailed'));
    } finally {
      setIsClearing(false);
    }
  };

  const dataItems = [
    {
      icon: Factory,
      titleKey: 'onboarding.progressSteps.cellsTitle',
      descKey: 'onboarding.cellsDescription',
    },
    {
      icon: FileBox,
      titleKey: 'onboarding.progressSteps.jobsTitle',
      descKey: 'onboarding.jobsDescription',
    },
    {
      icon: Package,
      titleKey: 'onboarding.progressSteps.partsTitle',
      descKey: 'onboarding.partsDescription',
    },
    {
      icon: ClipboardList,
      titleKey: 'onboarding.progressSteps.operationsTitle',
      descKey: 'onboarding.operationsDescription',
    },
    {
      icon: Wrench,
      titleKey: 'onboarding.progressSteps.resourcesTitle',
      descKey: 'onboarding.progressSteps.resourcesDesc',
    },
  ];

  const progressStepLabels: Record<string, string> = {
    cells: t('onboarding.progressSteps.cells'),
    calendar: t('onboarding.progressSteps.calendar'),
    operators: t('onboarding.progressSteps.operators'),
    resources: t('onboarding.progressSteps.resources'),
    jobs: t('onboarding.progressSteps.jobs'),
    parts: t('onboarding.progressSteps.parts'),
    operations: t('onboarding.progressSteps.operations'),
    resourceLinks: t('onboarding.progressSteps.resourceLinks'),
    timeEntries: t('onboarding.progressSteps.timeEntries'),
    quantities: t('onboarding.progressSteps.quantities'),
    issues: t('onboarding.progressSteps.issues'),
    complete: t('onboarding.progressSteps.complete'),
  };

  // All step keys in order for showing completed/active/pending
  const allStepKeys = [
    'cells', 'calendar', 'operators', 'resources', 'jobs',
    'parts', 'operations', 'resourceLinks', 'timeEntries',
    'quantities', 'issues',
  ];

  const renderProgressBar = () => {
    if (!progress && !isImporting) return null;

    const percentage = progress?.percentage ?? 0;
    const currentStepIndex = progress ? progress.step - 1 : -1;

    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Main progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              {progress ? progressStepLabels[progress.label] || progress.label : t('onboarding.progressSteps.preparing')}
            </span>
            <span className="text-primary font-semibold tabular-nums">
              {percentage}%
            </span>
          </div>
          <div className="onboarding-progress-track">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
          {allStepKeys.map((key, idx) => {
            const StepIcon = PROGRESS_STEP_ICONS[key] || Database;
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            let stateClass = 'pending';
            if (isCompleted || (importComplete && percentage === 100)) stateClass = 'completed';
            else if (isActive) stateClass = 'active';

            return (
              <div
                key={key}
                className={`onboarding-progress-step ${stateClass} step-animate-in`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className={`onboarding-step-dot ${stateClass}`}>
                  {stateClass === 'completed' ? (
                    <Check className="h-3 w-3" />
                  ) : stateClass === 'active' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <StepIcon className="h-3 w-3" />
                  )}
                </div>
                <span className="text-xs truncate">
                  {progressStepLabels[key]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Database className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">{t('onboarding.sampleData')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('onboarding.sampleDataDescription')}
        </p>
      </div>

      <Alert>
        <AlertDescription>
          {t('onboarding.sampleDataExplanation')}
        </AlertDescription>
      </Alert>

      {/* Show data items when NOT importing */}
      {!isImporting && !importComplete && (
        <div className="grid sm:grid-cols-2 gap-4">
          {dataItems.map((item, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t(item.titleKey)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{t(item.descKey)}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress bar during import */}
      {(isImporting || (importComplete && progress)) && renderProgressBar()}

      {/* Success message */}
      {importComplete && (
        <Alert className="bg-alert-success-bg border-alert-success-border success-pulse">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            {t('onboarding.sampleDataImported')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!importComplete ? (
          <>
            <Button
              size="lg"
              onClick={handleImport}
              disabled={isImporting}
              className="cta-button min-w-[200px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('onboarding.importing')}
                </>
              ) : (
                <>
                  {t('onboarding.importSampleData')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={onSkip} disabled={isImporting}>
              {t('onboarding.skipForNow')}
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onComplete} className="cta-button min-w-[200px]">
              {t('onboarding.continueToApp')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleClearAndReimport}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('onboarding.resetting')}
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  {t('onboarding.resetAndReimport')}
                </>
              )}
            </Button>
          </>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>{t('onboarding.sampleDataNote')}</p>
      </div>
    </div>
  );
}
