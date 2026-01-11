// Role-based layout routing with path awareness
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { OperatorLayout } from "@/components/operator/OperatorLayout";

interface LayoutProps {
  children: React.ReactNode;
}

// SECURITY NOTE: Layout selection based on role is for UI convenience only.
// Server-side RLS policies enforce actual data access permissions.
export default function Layout({ children }: LayoutProps) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  // Show nothing while loading to prevent layout flicker
  if (loading) {
    return null;
  }

  // Public pages (privacy policy, terms, etc.) render without a role-based layout
  if (!profile) {
    return <>{children}</>;
  }

  // Check if current path is an operator view path
  const isOperatorPath = location.pathname.startsWith("/operator/");

  // Use operator layout for operator paths (both for operators and admins viewing operator screens)
  if (isOperatorPath) {
    return <OperatorLayout showBackToAdmin={profile.role === "admin"}>{children}</OperatorLayout>;
  }

  // Use admin layout for admin paths (only admins should reach these via route protection)
  if (profile.role === "admin") {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Default to operator layout for non-admin users on non-operator paths
  return <OperatorLayout>{children}</OperatorLayout>;
}
