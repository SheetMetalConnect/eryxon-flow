import { useProfile } from "@/hooks/useProfile";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useLocation } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { OperatorLayout } from "@/components/operator/OperatorLayout";

interface LayoutProps {
  children: React.ReactNode;
}

// SECURITY NOTE: Layout selection based on role is for UI convenience only.
// Server-side RLS policies enforce actual data access permissions.
export default function Layout({ children }: LayoutProps) {
  const profile = useProfile();
  const { loading } = useAuthActions();
  const location = useLocation();

  // Prevent layout flicker while auth is resolving
  if (loading || !profile) {
    return null;
  }

  const isOperatorPath = location.pathname.startsWith("/operator/");

  if (isOperatorPath) {
    return <OperatorLayout showBackToAdmin={profile.role === "admin"}>{children}</OperatorLayout>;
  }

  if (profile.role === "admin") {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return <OperatorLayout>{children}</OperatorLayout>;
}
