import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import {
  BarChart3,
  Activity,
  Truck,
  Eye,
  Plug,
  AlertCircle,
  CalendarClock,
  UserCheck,
  Box,
} from 'lucide-react';
import {
  useFeatureFlags,
  FEATURE_FLAG_METADATA,
  FeatureFlags,
  FeatureFlagMeta,
} from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';

// Icon mapping for feature flags
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  Activity,
  Truck,
  Eye,
  Plug,
  AlertCircle,
  CalendarClock,
  UserCheck,
  Box,
};

// Category labels and order
const CATEGORIES = [
  { key: 'operations', labelKey: 'featureFlags.categories.operations' },
  { key: 'analytics', labelKey: 'featureFlags.categories.analytics' },
  { key: 'admin', labelKey: 'featureFlags.categories.admin' },
] as const;

// External services category (shown separately with warning)

// Feature flags that require external services
const EXTERNAL_SERVICE_FLAGS = ['advancedCAD'] as const;

interface FeatureFlagItemProps {
  meta: FeatureFlagMeta;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function FeatureFlagItem({ meta, enabled, onToggle, disabled }: FeatureFlagItemProps) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[meta.icon] || Activity;
  const isExternalService = EXTERNAL_SERVICE_FLAGS.includes(meta.key as typeof EXTERNAL_SERVICE_FLAGS[number]);

  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-lg border p-4 transition-all duration-200',
        enabled
          ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
          : 'border-border/50 bg-muted/30 hover:border-border',
        isExternalService && 'border-dashed'
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
            enabled
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium transition-colors',
              enabled ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {t(meta.labelKey)}
            </span>
            {isExternalService && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600">
                External
              </Badge>
            )}
            {enabled && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                {t('featureFlags.enabled')}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(meta.descriptionKey)}
          </p>
          {isExternalService && (
            <p className="text-xs text-amber-600/80 mt-1">
              {t('featureFlags.externalServiceNote')}
            </p>
          )}
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}

export function FeatureFlagsSettings() {
  const { t } = useTranslation();
  const {
    flags,
    isLoading,
    toggleFlag,
    enableAll,
    disableAll,
    isSaving,
  } = useFeatureFlags();

  // Group flags by category
  const flagsByCategory = CATEGORIES.map((category) => ({
    ...category,
    flags: FEATURE_FLAG_METADATA.filter((meta) => meta.category === category.key),
  }));

  // Count enabled flags
  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('featureFlags.title')}</CardTitle>
              <CardDescription>{t('featureFlags.description')}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {enabledCount}/{totalCount}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Quick Actions */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-3">
        <span className="text-sm text-muted-foreground">
          {t('featureFlags.quickActions')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={disableAll}
            disabled={isSaving || enabledCount === 0}
            className="gap-1.5 text-xs"
          >
            <ToggleLeft className="h-3.5 w-3.5" />
            {t('featureFlags.disableAll')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={enableAll}
            disabled={isSaving || enabledCount === totalCount}
            className="gap-1.5 text-xs"
          >
            <ToggleRight className="h-3.5 w-3.5" />
            {t('featureFlags.enableAll')}
          </Button>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Info Banner */}
        <div className="rounded-lg bg-info/10 border border-info/20 p-4">
          <p className="text-sm text-info">
            <span className="font-medium">{t('featureFlags.infoTitle')}</span>{' '}
            {t('featureFlags.infoDescription')}
          </p>
        </div>

        {/* Feature Flags by Category */}
        {flagsByCategory.map((category) => (
          <div key={category.key} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t(category.labelKey)}
            </h3>
            <div className="space-y-2">
              {category.flags.map((meta) => (
                <FeatureFlagItem
                  key={meta.key}
                  meta={meta}
                  enabled={flags[meta.key]}
                  onToggle={() => toggleFlag(meta.key)}
                  disabled={isSaving}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Footer Note */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {t('featureFlags.footerNote')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
