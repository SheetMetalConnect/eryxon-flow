// Role-based layout routing
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { OperatorLayout } from "@/components/operator/OperatorLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, loading } = useAuth();

  // Show nothing while loading to prevent layout flicker
  if (loading || !profile) {
    return null;
  }

  // Route to appropriate layout based on user role
  if (profile.role === "admin") {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Default to operator layout for operator role
  return <OperatorLayout>{children}</OperatorLayout>;
}
