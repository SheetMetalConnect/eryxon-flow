import { lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useProfile } from "./hooks/useProfile";
import { useAuthActions } from "./hooks/useAuthActions";
import { useNative } from "./hooks/useNative";
import { OperatorProvider } from "./contexts/OperatorContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./components/NotificationToastProvider";
import { McpActivityToasts } from "./components/admin/McpActivityToasts";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";

import {
  ProtectedRoute,
  LazyRoute,
  OperatorRoutes,
  AdminRoutes,
  CommonRoutes,
  MobileRoutes,
} from "./routes";

// Auth is the landing page — keep it eager so first paint never waits on a
// second chunk. Everything else routes through lazy() so the entry bundle
// stays small; importing the page barrels here would statically link every
// operator page into the entry chunk and defeat the route-level splitting.
import Auth from "./pages/auth/Auth";

const AcceptInvitation = lazy(() => import("./pages/auth/AcceptInvitation"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const TerminalLogin = lazy(() => import("./pages/operator/TerminalLogin"));
const OnboardingWizard = lazy(() => import("./components/onboarding").then(m => ({ default: m.OnboardingWizard })));
const NotFound = lazy(() => import("./pages/NotFound"));

function AppRoutes() {
  const profile = useProfile();
  const { loading } = useAuthActions();
  const native = useNative();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Operators inside the iOS app or on a phone-sized viewport land on the
  // touch-first shell. Admins on iPad still get the desktop UI by default
  // (they can deep-link into /m if they want the touch chrome).
  const preferMobileShell = native.isNative || native.isMobileShell;
  // The wizard is an admin-only first-run flow (team setup, plan, mock data),
  // so only incomplete admins are routed into it. Operators never get gated.
  const needsOnboarding =
    profile?.role === "admin" && profile?.onboarding_completed === false;
  const homeTarget = needsOnboarding
    ? "/onboarding"
    : profile?.role === "admin"
      ? "/admin/dashboard"
      : preferMobileShell
        ? "/m/queue"
        : "/operator/work-queue";

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<LazyRoute><ForgotPassword /></LazyRoute>} />
      <Route path="/reset-password" element={<LazyRoute><ResetPassword /></LazyRoute>} />
      <Route path="/operator/login" element={<LazyRoute><TerminalLogin /></LazyRoute>} />
      <Route path="/accept-invitation/:token" element={<LazyRoute><AcceptInvitation /></LazyRoute>} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <LazyRoute>
              <OnboardingWizard />
            </LazyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to={homeTarget} replace />}
      />

      {/* Route groups */}
      {MobileRoutes()}
      {OperatorRoutes()}
      {AdminRoutes()}
      {CommonRoutes()}

      <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PwaUpdatePrompt />
        <BrowserRouter>
          <AuthProvider>
            <OperatorProvider>
              <NotificationToastProvider>
                <McpActivityToasts />
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </NotificationToastProvider>
            </OperatorProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
