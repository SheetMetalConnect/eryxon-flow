import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  plan: "free" | "pro" | "premium";
  status: "active" | "cancelled" | "suspended" | "trial";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  tenant: TenantInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: Partial<Profile> & { company_name?: string }) => Promise<{ error: Error | null; data?: any }>;
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile data after session is established
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
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
        .single();

      if (error) throw error;
      setProfile(data as Profile);

      // Fetch tenant info after profile is loaded
      if (data) {
        await fetchTenant();
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenant = async () => {
    try {
      const { data, error } = await supabase.rpc("get_tenant_info");

      if (error) throw error;

      // The RPC returns an array, get the first element
      if (data && data.length > 0) {
        setTenant(data[0]);
      }
    } catch (error) {
      console.error("Error fetching tenant:", error);
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      // Only root admins can switch tenants
      if (!profile?.is_root_admin) {
        throw new Error("Only root administrators can switch tenants");
      }

      // Call the set_active_tenant RPC
      const { error } = await supabase.rpc("set_active_tenant", {
        p_tenant_id: tenantId,
      });

      if (error) throw error;

      // Refresh tenant info to reflect the change
      await fetchTenant();

      // Optionally reload the page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error("Error switching tenant:", error);
      throw error;
    }
  };

  const refreshTenant = async () => {
    await fetchTenant();
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
    userData: Partial<Profile> & { company_name?: string }
  ) => {
    try {
      // Generate username from email (part before @)
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
