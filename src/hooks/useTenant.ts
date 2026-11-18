import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: returns tenant info + refresh.
 *  Use this for plan checks, whitelabel, feature flags. */
export function useTenant() {
  const { tenant, refreshTenant } = useAuth();
  return { tenant, refreshTenant };
}
