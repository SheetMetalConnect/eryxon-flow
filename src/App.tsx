import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./components/mui/ToastNotification";
import { NotificationToastProvider } from "./components/NotificationToastProvider";
import Auth from "./pages/Auth";
import WorkQueue from "./pages/operator/WorkQueue";
import MyActivity from "./pages/operator/MyActivity";
import MyIssues from "./pages/operator/MyIssues";
import OperatorView from "./pages/operator/OperatorView";
import Dashboard from "./pages/admin/Dashboard";
import IssueQueue from "./pages/admin/IssueQueue";
import ConfigStages from "./pages/admin/ConfigStages";
import ConfigMaterials from "./pages/admin/ConfigMaterials";
import ConfigResources from "./pages/admin/ConfigResources";
import ConfigUsers from "./pages/admin/ConfigUsers";
import Assignments from "./pages/admin/Assignments";
import ConfigApiKeys from "./pages/admin/ConfigApiKeys";
import ConfigWebhooks from "./pages/admin/ConfigWebhooks";
import DataExport from "./pages/admin/DataExport";
import Jobs from "./pages/admin/Jobs";
import JobCreate from "./pages/admin/JobCreate";
import Parts from "./pages/admin/Parts";
import { ActivityMonitor } from "./pages/admin/ActivityMonitor";
import { Operations } from "./pages/admin/Operations";
import { Settings } from "./pages/admin/Settings";
import IntegrationsMarketplace from "./pages/admin/IntegrationsMarketplace";
import StepsTemplatesView from "./pages/admin/StepsTemplatesView";
import ApiDocs from "./pages/ApiDocs";
import Pricing from "./pages/Pricing";
import { MyPlan } from "./pages/MyPlan";
import Help from "./pages/Help";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import { OnboardingWizard } from "./components/onboarding";
import Layout from "./components/Layout";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// SECURITY NOTE: This route protection is for UI convenience only.
// Actual authorization is enforced server-side via RLS policies.
// Attackers can bypass these checks, but they cannot access data without proper RLS permissions.
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
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
      <Route path="/auth" element={<Auth />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <Navigate
            to={
              (profile as any)?.onboarding_completed === false
                ? "/onboarding"
                : profile?.role === "admin"
                ? "/admin/dashboard"
                : "/operator/work-queue"
            }
            replace
          />
        }
      />

      {/* Operator Routes */}
      <Route
        path="/operator/work-queue"
        element={
          <ProtectedRoute>
            <Layout>
              <WorkQueue />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator/my-activity"
        element={
          <ProtectedRoute>
            <Layout>
              <MyActivity />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator/my-issues"
        element={
          <ProtectedRoute>
            <Layout>
              <MyIssues />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator/view"
        element={
          <ProtectedRoute>
            <Layout>
              <OperatorView />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Legacy operator route redirects */}
      <Route path="/work-queue" element={<Navigate to="/operator/work-queue" replace />} />
      <Route path="/my-activity" element={<Navigate to="/operator/my-activity" replace />} />
      <Route path="/my-issues" element={<Navigate to="/operator/my-issues" replace />} />
      <Route path="/operator-view" element={<Navigate to="/operator/view" replace />} />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Legacy dashboard redirect */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

      <Route
        path="/admin/config/stages"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigStages />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/materials"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigMaterials />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/resources"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigResources />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/users"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigUsers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/issues"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <IssueQueue />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Assignments />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/api-keys"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigApiKeys />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/webhooks"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigWebhooks />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/data-export"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <DataExport />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Jobs />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/jobs/new"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <JobCreate />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/parts"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Parts />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/activity"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ActivityMonitor />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/operations"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Operations />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/integrations"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <IntegrationsMarketplace />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/steps-templates"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <StepsTemplatesView />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/api-docs"
        element={
          <ProtectedRoute>
            <Layout>
              <ApiDocs />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/pricing"
        element={
          <ProtectedRoute>
            <Layout>
              <Pricing />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/my-plan"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <MyPlan />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/help"
        element={
          <ProtectedRoute>
            <Layout>
              <Help />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/about"
        element={
          <ProtectedRoute>
            <Layout>
              <About />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Legacy redirects */}
      <Route path="/admin/stages" element={<Navigate to="/admin/config/stages" replace />} />
      <Route path="/admin/materials" element={<Navigate to="/admin/config/materials" replace />} />
      <Route path="/admin/resources" element={<Navigate to="/admin/config/resources" replace />} />
      <Route path="/admin/users" element={<Navigate to="/admin/config/users" replace />} />
      <Route path="/api-docs" element={<Navigate to="/admin/api-docs" replace />} />
      <Route path="/pricing" element={<Navigate to="/admin/pricing" replace />} />
      <Route path="/my-plan" element={<Navigate to="/admin/my-plan" replace />} />
      <Route path="/help" element={<Navigate to="/admin/help" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ToastProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NotificationToastProvider>
                <AppRoutes />
              </NotificationToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ToastProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
