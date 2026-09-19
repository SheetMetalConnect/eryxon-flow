import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";
import { registerPushNotifications } from "@/native";

// UI roles are informational; database policies enforce authorization.
interface Profile {
  id: string;
  tenant_id: string;
  username: string;
  full_name: string;
  email: string;
  role: "operator" | "admin"; // UI convenience only - NOT for security
  active: boolean;
  is_machine: boolean;
  is_root_admin: boolean;
  // First-run onboarding state. The router (src/App.tsx) and the wizard
  // (OnboardingWizard) gate on these, so they must be hydrated here.
  onboarding_completed: boolean;
  onboarding_step: number;
}

interface TenantInfo {
  id: string;
  name: string;
  company_name: string | null;
  plan: "free" | "pro" | "premium" | "enterprise";
  status: "active" | "cancelled" | "suspended" | "trial";
  trial_ends_at: string | null;
  working_days_mask: number | null;
  factory_opening_time: string | null;
  factory_closing_time: string | null;
  timezone: string | null;
  // Whitelabeling fields for managed hosting
  whitelabel_enabled: boolean;
  whitelabel_logo_url: string | null;
  whitelabel_app_name: string | null;
  whitelabel_primary_color: string | null;
  whitelabel_favicon_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  tenant: TenantInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: Partial<Profile> & { company_name?: string; invitation_token?: string }) => Promise<{ error: Error | null; data?: unknown }>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const updateSession = (nextSession: Session | null) => {
    const nextUserId = nextSession?.user.id ?? null;
    if (activeUserId.current !== nextUserId || nextUserId === null) {
      authRevision.current += 1;
      activeUserId.current = nextUserId;
      queryClient.clear();
      setProfile(null);
      setTenant(null);
      setLoading(nextUserId !== null);
    }
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  };

  useEffect(() => {
    // `SIGNED_IN` fires on first login *and* on every token refresh and on
    // every browser tab restore — Supabase replays the most recent event to
    // newly mounted listeners. We only want push registration to happen on
    // a *fresh* sign-in (user id changed), so we track the last user id we
    // already registered for.
    let lastRegisteredUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // When a token refresh fails, session is null — purge the stale
        // refresh token from localStorage so the user can log in fresh.
        if (event === 'TOKEN_REFRESHED' && !session) {
          logger.warn('AuthContext', 'Token refresh failed, signing out');
          supabase.auth.signOut();
          updateSession(null);
          lastRegisteredUserId = null;
          return;
        }

        updateSession(session);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
          // Register once per identity; the Community web adapter is a no-op.
          if (
            event === 'SIGNED_IN' &&
            session.user.id !== lastRegisteredUserId
          ) {
            lastRegisteredUserId = session.user.id;
            void registerPushNotifications().then((reg) => {
              if (reg) {
                logger.debug('AuthContext', 'Push registration', reg.platform);
              }
            });
          }
        } else {
          setProfile(null);
          setTenant(null);
          setLoading(false);
          // No active user (e.g. SIGNED_OUT carries no session.user): clear the
          // push-registration cache so signing back in as the same user during
          // the same runtime re-registers the device token.
          lastRegisteredUserId = null;
        }
      }
    );

    const initialRevision = authRevision.current;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (authRevision.current !== initialRevision) return;
      if (error) {
        logger.error('AuthContext', 'Failed to recover session, signing out', error);
        supabase.auth.signOut();
        updateSession(null);
        return;
      }

      updateSession(session);

      if (session?.user) {
        logger.info('AuthContext', 'Session recovered', session.user.id);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setTenant(null);
        setLoading(false);
      }
    });

    return () => {
      authRevision.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const revision = authRevision.current;
    const isCurrent = () => revision === authRevision.current && userId === activeUserId.current;
    try {
      const [{ data, error }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, tenant_id, username, full_name, email, role, active, is_machine, is_root_admin, onboarding_completed, onboarding_step")
          .eq("id", userId)
          .maybeSingle(),
        fetchTenant(revision),
      ]);

      if (!isCurrent()) return;
      if (error) throw error;

      if (!data) {
        setProfile(null);
        setTenant(null);
        return;
      }

      // Columns are nullable in the DB (defaults applied on insert); coerce to
      // concrete values so the router/wizard gates are deterministic.
      setProfile({
        ...(data as Profile),
        onboarding_completed: data.onboarding_completed ?? false,
        onboarding_step: data.onboarding_step ?? 0,
      });
    } catch (error) {
      logger.error('AuthContext', 'Error fetching profile', error);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  const fetchTenant = async (revision = authRevision.current) => {
    try {
      const { data, error } = await supabase.rpc("get_tenant_info");

      if (revision !== authRevision.current) return;
      if (error) throw error;

      if (data && data.length > 0) {
        const tenantData = data[0] as Record<string, unknown>;
        setTenant({
          id: tenantData.id as string,
          name: tenantData.name as string,
          company_name: (tenantData.company_name as string | null) ?? null,
          plan: tenantData.plan as TenantInfo['plan'],
          status: tenantData.status as TenantInfo['status'],
          trial_ends_at: (tenantData.trial_ends_at as string | null) ?? null,
          working_days_mask: (tenantData.working_days_mask as number | null) ?? null,
          factory_opening_time: (tenantData.factory_opening_time as string | null) ?? null,
          factory_closing_time: (tenantData.factory_closing_time as string | null) ?? null,
          timezone: (tenantData.timezone as string | null) ?? null,
          whitelabel_enabled: (tenantData.whitelabel_enabled as boolean) ?? false,
          whitelabel_logo_url: (tenantData.whitelabel_logo_url as string | null) ?? null,
          whitelabel_app_name: (tenantData.whitelabel_app_name as string | null) ?? null,
          whitelabel_primary_color: (tenantData.whitelabel_primary_color as string | null) ?? null,
          whitelabel_favicon_url: (tenantData.whitelabel_favicon_url as string | null) ?? null,
        });
      }
    } catch (error) {
      logger.error('AuthContext', 'Error fetching tenant', error);
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      if (!profile?.is_root_admin) {
        throw new Error("Only root administrators can switch tenants");
      }

      const { error } = await supabase.rpc("set_active_tenant", {
        p_tenant_id: tenantId,
      });

      if (error) throw error;

      logger.info('AuthContext', 'Tenant switched', tenantId);

      authRevision.current += 1;
      queryClient.clear();
      await fetchTenant();
      window.location.reload();
    } catch (error) {
      logger.error('AuthContext', 'Error switching tenant', error);
      throw error;
    }
  };

  const refreshTenant = async () => {
    await fetchTenant();
  };

  // Re-hydrate the profile after a mutation that changes durable profile state
  // (e.g. completing onboarding) so router gates reflect the new state without
  // requiring a full reload.
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<Profile> & { company_name?: string; invitation_token?: string }
  ) => {
    try {
      const username = email.split('@')[0];

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username,
            full_name: userData.full_name,
            role: userData.role || "operator",
            tenant_id: userData.tenant_id,
            company_name: userData.company_name,
            invitation_token: userData.invitation_token,
            // Default hosted alpha to trial; can be overridden via invite metadata
            tenant_status: 'trial',
          },
        },
      });
      return { error, data };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    updateSession(null);
    try {
      const { error } = await supabase.rpc("clear_operator_session");
      if (error) throw error;
    } catch (error) {
      logger.error("AuthContext", "Could not revoke the operator session", error);
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tenant,
        loading,
        signIn,
        signUp,
        signOut,
        switchTenant,
        refreshTenant,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
