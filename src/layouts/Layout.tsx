// Role-based layout routing
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { OperatorLayout } from "@/layouts/OperatorLayout";

interface LayoutProps {
  children: React.ReactNode;
}

// SECURITY NOTE: Layout selection based on role is for UI convenience only.
// Server-side RLS policies enforce actual data access permissions.
export default function Layout({ children }: LayoutProps) {
  const { profile, loading } = useAuth();

  // Show nothing while loading to prevent layout flicker
  if (loading || !profile) {
    return null;
  }

  // UI-only: Route to appropriate layout based on user role
  // This provides better UX but provides ZERO security
  if (profile.role === "admin") {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Default to operator layout for operator role
  return <OperatorLayout>{children}</OperatorLayout>;
}
