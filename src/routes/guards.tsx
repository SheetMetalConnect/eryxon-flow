import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// SECURITY NOTE: This route protection is for UI convenience only.
// Actual authorization is enforced server-side via RLS policies.
// Attackers can bypass these checks, but they cannot access data without proper RLS permissions.
export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  // UI-only check: redirect operators away from admin pages (convenience, not security)
  if (adminOnly && profile.role !== "admin") {
    return <Navigate to="/operator/work-queue" replace />;
  }

  return <>{children}</>;
}
