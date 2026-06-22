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
export function ProtectedRoute({
  children,
  adminOnly = false,
  operatorOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  operatorOnly?: boolean;
}) {
  const profile = useProfile();
  const { user } = useSession();
  const { loading } = useAuthActions();
  const native = useNative();
  const location = useLocation();
  const { activeOperator, isLoading: operatorLoading } = useOperator();

  if (loading || operatorLoading) {
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

  // UI-only check: operator views (terminal / kanban) are open to operators, to a
  // PIN'd shop-floor operator, AND to admins/shift-leaders for oversight. Only an
  // unauthenticated-as-operator non-admin is sent to the operator login.
  if (
    operatorOnly &&
    profile.role !== "operator" &&
    profile.role !== "admin" &&
    !activeOperator
  ) {
    return (
      <Navigate
        to={ROUTES.OPERATOR.LOGIN}
        replace
        state={{ from: buildReturnTo(location) }}
      />
    );
  }

  return <>{children}</>;
}

type OperatorGateOutcome = "loading" | "redirect" | "allow";

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

export function RequireActiveOperator({
  children,
}: {
  children: React.ReactNode;
}) {
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
