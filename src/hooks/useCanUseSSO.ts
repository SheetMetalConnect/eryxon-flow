import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current tenant can use Enterprise SSO features.
 * Enterprise SSO (domain enforcement, SAML, etc.) is only available on Premium/Enterprise plans.
 *
 * Note: This is separate from basic OAuth login (Microsoft/Google buttons),
 * which is available to ALL users regardless of plan.
 */
export function useCanUseSSO() {
  const { tenant } = useAuth();

  const canUseSSO = useMemo(() => {
    if (!tenant) return false;
    return tenant.plan === 'premium' || tenant.plan === 'enterprise';
  }, [tenant?.plan]);

  const ssoEnabled = useMemo(() => {
    return tenant?.sso_enabled ?? false;
  }, [tenant?.sso_enabled]);

  const ssoProvider = useMemo(() => {
    return tenant?.sso_provider ?? null;
  }, [tenant?.sso_provider]);

  const ssoDomain = useMemo(() => {
    return tenant?.sso_domain ?? null;
  }, [tenant?.sso_domain]);

  const ssoEnforceOnly = useMemo(() => {
    return tenant?.sso_enforce_only ?? false;
  }, [tenant?.sso_enforce_only]);

  return {
    /** Whether the tenant is on a plan that supports Enterprise SSO */
    canUseSSO,
    /** Whether Enterprise SSO is currently enabled for this tenant */
    ssoEnabled,
    /** The configured SSO provider ('microsoft', 'google', 'saml') */
    ssoProvider,
    /** The email domain for SSO routing */
    ssoDomain,
    /** Whether password login is disabled (SSO only) */
    ssoEnforceOnly,
  };
}
