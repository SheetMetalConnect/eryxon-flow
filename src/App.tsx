import { lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OperatorProvider } from "./contexts/OperatorContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./components/NotificationToastProvider";
import { McpActivityToasts } from "./components/admin/McpActivityToasts";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";

import { ProtectedRoute, LazyRoute, OperatorRoutes, AdminRoutes, CommonRoutes } from "./routes";

import { Auth, AcceptInvitation, ForgotPassword, ResetPassword } from "./pages/auth";
import { TerminalLogin } from "./pages/operator";

const OnboardingWizard = lazy(() => import("./components/onboarding").then(m => ({ default: m.OnboardingWizard })));
const NotFound = lazy(() => import("./pages/NotFound"));

function AppRoutes() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/operator/login" element={<TerminalLogin />} />
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

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
        element={
          <Navigate
            to={
              (profile as { onboarding_completed?: boolean })?.onboarding_completed === false
                ? "/onboarding"
                : profile?.role === "admin"
                  ? "/admin/dashboard"
                  : "/operator/work-queue"
            }
            replace
          />
        }
      />

      {/* Route groups */}
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
