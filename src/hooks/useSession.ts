import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: returns Supabase session/user.
 *  Use for API calls that need the Bearer token. */
export function useSession() {
  const { user, session } = useAuth();
  return { user, session };
}
