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
import StepsTemplatesView from "./pages/admin/StepsTemplatesView";
import ApiDocs from "./pages/ApiDocs";
import Pricing from "./pages/Pricing";
import { MyPlan } from "./pages/MyPlan";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import { OnboardingWizard } from "./components/onboarding";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

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

  if (adminOnly && profile.role !== "admin") {
    return <Navigate to="/work-queue" replace />;
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
                ? "/dashboard"
                : "/work-queue"
            }
            replace
          />
        }
      />

      <Route
        path="/work-queue"
        element={
          <ProtectedRoute>
            <WorkQueue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-activity"
        element={
          <ProtectedRoute>
            <MyActivity />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-issues"
        element={
          <ProtectedRoute>
            <MyIssues />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute adminOnly>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/stages"
        element={
          <ProtectedRoute adminOnly>
            <ConfigStages />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/stages"
        element={
          <ProtectedRoute adminOnly>
            <ConfigStages />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/materials"
        element={
          <ProtectedRoute adminOnly>
            <ConfigMaterials />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/resources"
        element={
          <ProtectedRoute adminOnly>
            <ConfigResources />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <ConfigUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/users"
        element={
          <ProtectedRoute adminOnly>
            <ConfigUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/issues"
        element={
          <ProtectedRoute adminOnly>
            <IssueQueue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute adminOnly>
            <Assignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/api-keys"
        element={
          <ProtectedRoute adminOnly>
            <ConfigApiKeys />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/webhooks"
        element={
          <ProtectedRoute adminOnly>
            <ConfigWebhooks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/data-export"
        element={
          <ProtectedRoute adminOnly>
            <DataExport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute adminOnly>
            <Jobs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/jobs/new"
        element={
          <ProtectedRoute adminOnly>
            <JobCreate />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/parts"
        element={
          <ProtectedRoute adminOnly>
            <Parts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/activity"
        element={
          <ProtectedRoute adminOnly>
            <ActivityMonitor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/operations"
        element={
          <ProtectedRoute adminOnly>
            <Operations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/steps-templates"
        element={
          <ProtectedRoute adminOnly>
            <StepsTemplatesView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/api-docs"
        element={
          <ProtectedRoute>
            <ApiDocs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pricing"
        element={
          <ProtectedRoute>
            <Pricing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-plan"
        element={
          <ProtectedRoute adminOnly>
            <MyPlan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <Help />
          </ProtectedRoute>
        }
      />

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
