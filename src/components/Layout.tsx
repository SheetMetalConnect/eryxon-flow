import { useProfile } from "@/hooks/useProfile";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useLocation } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { OperatorLayout } from "@/components/operator/OperatorLayout";
import { OfflineBanner } from "@/components/mobile/OfflineBanner";

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

  const layout = isOperatorPath ? (
    <OperatorLayout showBackToAdmin={profile.role === "admin"}>{children}</OperatorLayout>
  ) : profile.role === "admin" ? (
    <AdminLayout>{children}</AdminLayout>
  ) : (
    <OperatorLayout>{children}</OperatorLayout>
  );

  // Shop-floor WiFi drops mid-shift; desktop terminals need the same
  // unambiguous "writes will fail" signal the mobile shell already shows.
  return (
    <>
      <OfflineBanner />
      {layout}
    </>
  );
}
