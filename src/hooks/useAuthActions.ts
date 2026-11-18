import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: auth mutations (sign in/up/out, tenant switch).
 *  Only 3-4 components need this. */
export function useAuthActions() {
  const { signIn, signUp, signOut, switchTenant, loading } = useAuth();
  return { signIn, signUp, signOut, switchTenant, loading };
}
