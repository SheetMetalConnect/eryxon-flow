import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useOperator } from "@/contexts/OperatorContext";
import { Loader2 } from "lucide-react";
import { ROUTES } from "./constants";
import { buildReturnTo } from "./launchTargets";

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

  if (adminOnly && profile.role !== "admin") {
    return (
      <Navigate
        to={ROUTES.OPERATOR.WORK_QUEUE}
        replace
      />
    );
  }

  // Admin oversight uses account identity; production operators verify an employee PIN.
  if (
    operatorOnly &&
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
