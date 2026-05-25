import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useNative } from "@/hooks/useNative";
import { useOperator } from "@/contexts/OperatorContext";
import { Loader2 } from "lucide-react";
import { ROUTES } from "./constants";
import { buildReturnTo, resolveOperatorHomeTarget } from "./launchTargets";

// SECURITY NOTE: This route protection is for UI convenience only.
// Actual authorization is enforced server-side via RLS policies.
// Attackers can bypass these checks, but they cannot access data without proper RLS permissions.
export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const profile = useProfile();
  const { user } = useSession();
  const { loading } = useAuthActions();
  const native = useNative();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <Navigate
        to={ROUTES.AUTH}
        replace
        state={{ from: buildReturnTo(location) }}
      />
    );
  }

  // UI-only check: redirect operators away from admin pages (convenience, not security)
  if (adminOnly && profile.role !== "admin") {
    return (
      <Navigate
        to={resolveOperatorHomeTarget(native.isNative || native.isMobileShell)}
        replace
      />
    );
  }

  return <>{children}</>;
}

type OperatorGateOutcome = "loading" | "redirect" | "allow";

/**
 * Decide whether the mobile shell may render for the current operator session.
 * Pure so the gate is unit-testable without React.
 *
 * - `loading`  — the operator context is still hydrating from sessionStorage.
 * - `redirect` — no active operator/PIN session; bounce to the PIN login.
 * - `allow`    — a verified operator is active.
 */
export function resolveOperatorGate({
  isLoading,
  hasActiveOperator,
}: {
  isLoading: boolean;
  hasActiveOperator: boolean;
}): OperatorGateOutcome {
  if (isLoading) return "loading";
  if (!hasActiveOperator) return "redirect";
  return "allow";
}

/**
 * Operator-session gate for the `/m/*` mobile shell.
 *
 * `ProtectedRoute` only proves a Supabase account is signed in — on the shop
 * floor that is frequently a *shared* "Shopfloor" device account. Operator
 * actions (start/stop/complete/report-issue) must be attributed to a real
 * person, so this gate additionally requires a verified active-operator PIN
 * session before any mobile operator surface renders. Without it, the user is
 * sent to `/m/login` to badge in.
 *
 * Server-side RLS remains the real authorization boundary; this is the UI
 * enforcement that keeps a bare shared login from starting work.
 */
export function RequireActiveOperator({ children }: { children: React.ReactNode }) {
  const { activeOperator, isLoading } = useOperator();
  const location = useLocation();
  const outcome = resolveOperatorGate({
    isLoading,
    hasActiveOperator: Boolean(activeOperator),
  });

  if (outcome === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (outcome === "redirect") {
    return (
      <Navigate
        to={ROUTES.MOBILE.LOGIN}
        replace
        state={{ from: buildReturnTo(location) }}
      />
    );
  }

  return <>{children}</>;
}
