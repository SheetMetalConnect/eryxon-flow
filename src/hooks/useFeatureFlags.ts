import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Feature flag definitions for Eryxon MES
 * Each flag controls visibility of a major module or feature group
 *
 * Note: Some features require external services (marked below).
 * These are optional components that must be separately deployed.
 * See docs/SELF_HOSTING_GUIDE.md for deployment instructions.
 */
export interface FeatureFlags {
  // Core modules (always enabled - listed for reference)
  // dashboard: true (always on)
  // jobs: true (always on)
  // parts: true (always on)
  // operations: true (always on)

  // Toggleable feature groups
  analytics: boolean;       // Analytics section: QRM, OEE, Quality, Reliability, Jobs Analytics
  monitoring: boolean;      // Monitoring section: Activity, Expectations, Exceptions
  shipping: boolean;        // Shipping module
  operatorViews: boolean;   // Operator views: Cell Overview, Terminal, My Activity, My Issues
  integrations: boolean;    // Integrations: App Store, API Keys, Webhooks, MQTT, etc.
  issues: boolean;          // Issues tracking
  capacity: boolean;        // Capacity planning
  assignments: boolean;     // Assignments management

  // External service features (require separate deployment)
  advancedCAD: boolean;     // PMI/MBD extraction - requires eryxon3d service (services/eryxon3d)
}

/**
 * Default feature flags - core features enabled, external services disabled by default
 * External service features (advancedCAD) require separate deployment and are opt-in
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  analytics: true,
  monitoring: true,
  shipping: true,
  operatorViews: true,
  integrations: true,
  issues: true,
  capacity: true,
  assignments: true,
  // External service features - disabled by default (require separate deployment)
  advancedCAD: false,
};

/**
 * Feature flag metadata for UI display
 */
export interface FeatureFlagMeta {
  key: keyof FeatureFlags;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  category: 'core' | 'operations' | 'analytics' | 'admin';
}

export const FEATURE_FLAG_METADATA: FeatureFlagMeta[] = [
  {
    key: 'analytics',
    labelKey: 'featureFlags.analytics.label',
    descriptionKey: 'featureFlags.analytics.description',
    icon: 'BarChart3',
    category: 'analytics',
  },
  {
    key: 'monitoring',
    labelKey: 'featureFlags.monitoring.label',
    descriptionKey: 'featureFlags.monitoring.description',
    icon: 'Activity',
    category: 'analytics',
  },
  {
    key: 'shipping',
    labelKey: 'featureFlags.shipping.label',
    descriptionKey: 'featureFlags.shipping.description',
    icon: 'Truck',
    category: 'operations',
  },
  {
    key: 'operatorViews',
    labelKey: 'featureFlags.operatorViews.label',
    descriptionKey: 'featureFlags.operatorViews.description',
    icon: 'Eye',
    category: 'operations',
  },
  {
    key: 'integrations',
    labelKey: 'featureFlags.integrations.label',
    descriptionKey: 'featureFlags.integrations.description',
    icon: 'Plug',
    category: 'admin',
  },
  {
    key: 'issues',
    labelKey: 'featureFlags.issues.label',
    descriptionKey: 'featureFlags.issues.description',
    icon: 'AlertCircle',
    category: 'operations',
  },
  {
    key: 'capacity',
    labelKey: 'featureFlags.capacity.label',
    descriptionKey: 'featureFlags.capacity.description',
    icon: 'CalendarClock',
    category: 'operations',
  },
  {
    key: 'assignments',
    labelKey: 'featureFlags.assignments.label',
    descriptionKey: 'featureFlags.assignments.description',
    icon: 'UserCheck',
    category: 'operations',
  },
  // External service features
  {
    key: 'advancedCAD',
    labelKey: 'featureFlags.advancedCAD.label',
    descriptionKey: 'featureFlags.advancedCAD.description',
    icon: 'Box',
    category: 'admin',
  },
];

/**
 * Hook to access and manage feature flags for the current tenant
 */
export function useFeatureFlags() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Fetch feature flags from tenant settings
  const { data: flags, isLoading, error } = useQuery({
    queryKey: ['feature-flags', tenant?.id],
    queryFn: async (): Promise<FeatureFlags> => {
      if (!tenant?.id) {
        return DEFAULT_FEATURE_FLAGS;
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('feature_flags')
        .eq('id', tenant.id)
        .single();

      if (error) throw error;

      // Merge with defaults to ensure all flags exist
      const storedFlags = (data as any)?.feature_flags as Partial<FeatureFlags> | null;
      return {
        ...DEFAULT_FEATURE_FLAGS,
        ...(storedFlags || {}),
      };
    },
    enabled: !!tenant?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Mutation to update feature flags
  const updateFlags = useMutation({
    mutationFn: async (newFlags: Partial<FeatureFlags>) => {
      if (!tenant?.id) throw new Error('No tenant');

      const mergedFlags = {
        ...DEFAULT_FEATURE_FLAGS,
        ...flags,
        ...newFlags,
      };

      const { error } = await supabase
        .from('tenants')
        .update({ feature_flags: mergedFlags } as any)
        .eq('id', tenant.id);

      if (error) throw error;
      return mergedFlags;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags', tenant?.id] });
      toast.success(t('featureFlags.updateSuccess'));
    },
    onError: (error: Error) => {
      console.error('Failed to update feature flags:', error);
      toast.error(t('featureFlags.updateError'));
    },
  });

  // Toggle a single flag
  const toggleFlag = (key: keyof FeatureFlags) => {
    const currentValue = flags?.[key] ?? DEFAULT_FEATURE_FLAGS[key];
    updateFlags.mutate({ [key]: !currentValue });
  };

  // Check if a specific feature is enabled
  const isEnabled = (key: keyof FeatureFlags): boolean => {
    return flags?.[key] ?? DEFAULT_FEATURE_FLAGS[key];
  };

  // Enable all flags
  const enableAll = () => {
    updateFlags.mutate(DEFAULT_FEATURE_FLAGS);
  };

  // Disable all optional flags (keep core features)
  const disableAll = () => {
    const allDisabled: FeatureFlags = {
      analytics: false,
      monitoring: false,
      shipping: false,
      operatorViews: false,
      integrations: false,
      issues: false,
      capacity: false,
      assignments: false,
      advancedCAD: false,
    };
    updateFlags.mutate(allDisabled);
  };

  return {
    flags: flags ?? DEFAULT_FEATURE_FLAGS,
    isLoading,
    error,
    isEnabled,
    toggleFlag,
    updateFlags: updateFlags.mutate,
    enableAll,
    disableAll,
    isSaving: updateFlags.isPending,
  };
}

/**
 * Simple hook to check if a feature is enabled
 * Use this in components that just need to check a flag
 */
export function useIsFeatureEnabled(key: keyof FeatureFlags): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
