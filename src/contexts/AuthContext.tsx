import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";
import { prefetchCommonData } from "@/lib/cacheInvalidation";
import { registerPushNotifications } from "@/native";

// SECURITY NOTE: The role field here is for UI convenience only (showing/hiding UI elements).
// All actual authorization is enforced server-side via Row Level Security (RLS) policies
// using the has_role() function that queries the user_roles table.
// Client-side role checks provide ZERO security - they can be bypassed by attackers.
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
}

interface TenantInfo {
  id: string;
  name: string;
  company_name: string | null;
  plan: "free" | "pro" | "premium" | "enterprise";
  status: "active" | "cancelled" | "suspended" | "trial";
  trial_ends_at: string | null;
  working_days_mask: number | null;
  // Whitelabeling fields (premium feature)
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
  signIn: (email: string, password: string, captchaToken?: string | null) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: Partial<Profile> & { company_name?: string }, captchaToken?: string | null) => Promise<{ error: Error | null; data?: unknown }>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
          setSession(null);
          setUser(null);
          setProfile(null);
          setTenant(null);
          setLoading(false);
          lastRegisteredUserId = null;
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
          // First fresh sign-in inside a Capacitor WebView triggers an
          // APNs / FCM permission prompt and registers the device token.
          // Skipped on TOKEN_REFRESHED, on USER_UPDATED, on tab restore, and
          // when the user id hasn't changed since we last registered.
          // No-op on the web (returns null). Backend dispatch isn't wired
          // yet — see docs/IOS.md "Remaining iOS-only gaps" — but the
          // token is logged so an admin can verify the handshake before
          // flipping APNs on.
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
          if (event === 'SIGNED_OUT') {
            lastRegisteredUserId = null;
          }
        } else {
          setProfile(null);
          setTenant(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('AuthContext', 'Failed to recover session, signing out', error);
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setTenant(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setTenant(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, tenant_id, username, full_name, email, role, active, is_machine, is_root_admin")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setProfile(null);
        setTenant(null);
        return;
      }

      setProfile(data as Profile);
      await fetchTenant();
      prefetchCommonData(queryClient, data.tenant_id, {
        fetchCells: () => Promise.resolve(supabase.from('cells').select('*').eq('tenant_id', data.tenant_id).eq('active', true).then(r => r.data)),
        fetchMaterials: () => Promise.resolve(supabase.from('materials').select('*').eq('tenant_id', data.tenant_id).then(r => r.data)),
        fetchScrapReasons: () => Promise.resolve(supabase.from('scrap_reasons').select('*').eq('tenant_id', data.tenant_id).then(r => r.data)),
      });
    } catch (error) {
      logger.error('AuthContext', 'Error fetching profile', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenant = async () => {
    try {
      const { data, error } = await supabase.rpc("get_tenant_info");

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

  const signIn = async (email: string, password: string, captchaToken?: string | null) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: captchaToken || undefined,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<Profile> & { company_name?: string },
    captchaToken?: string | null
  ) => {
    try {
      const username = email.split('@')[0];

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          captchaToken: captchaToken || undefined,
          data: {
            username,
            full_name: userData.full_name,
            role: userData.role || "operator",
            tenant_id: userData.tenant_id,
            company_name: userData.company_name,
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
    await supabase.auth.signOut();
    setProfile(null);
    setTenant(null);
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
        refreshTenant
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
