import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: returns only the user profile.
 *  ~70% of useAuth consumers only need this. */
export function useProfile() {
  const { profile } = useAuth();
  return profile;
}
