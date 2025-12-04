import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./components/NotificationToastProvider";
import { McpActivityToasts } from "./components/admin/McpActivityToasts";
// Auth pages
import { Auth, AcceptInvitation } from "./pages/auth";

// Operator pages
import { WorkQueue, MyActivity, MyIssues, OperatorTerminal, OperatorView } from "./pages/operator";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import IssueQueue from "./pages/admin/IssueQueue";
import FactoryCalendar from "./pages/admin/FactoryCalendar";
import OrganizationSettings from "./pages/admin/OrganizationSettings";
import Assignments from "./pages/admin/Assignments";
import McpServerSettings from "./pages/admin/McpServerSettings";
import DataExport from "./pages/admin/DataExport";
import DataImport from "./pages/admin/DataImport";
import Jobs from "./pages/admin/Jobs";
import JobCreate from "./pages/admin/JobCreate";
import Parts from "./pages/admin/Parts";
import { ActivityMonitor } from "./pages/admin/ActivityMonitor";
import CapacityMatrix from "./pages/admin/CapacityMatrix";
import { Operations } from "./pages/admin/Operations";
import { Settings } from "./pages/admin/Settings";
import IntegrationsMarketplace from "./pages/admin/IntegrationsMarketplace";
import Shipments from "./pages/admin/Shipments";
import StepsTemplatesView from "./pages/admin/StepsTemplatesView";
import AnalyticsDashboard from "./pages/admin/Analytics";

// Admin config pages
import {
  ApiKeys as ConfigApiKeys,
  Materials as ConfigMaterials,
  McpKeys as ConfigMcpKeys,
  MqttPublishers as ConfigMqttPublishers,
  Resources as ConfigResources,
  ScrapReasons as ConfigScrapReasons,
  Stages as ConfigStages,
  Users as ConfigUsers,
  Webhooks as ConfigWebhooks,
} from "./pages/admin/config";

// Admin analytics pages
import {
  OEEAnalytics,
  ReliabilityAnalytics,
  QRMAnalytics,
  QRMDashboard,
  JobsAnalytics,
  QualityAnalytics,
} from "./pages/admin/analytics";

// Common pages
import {
  ApiDocs,
  Pricing,
  MyPlan,
  Help,
  About,
  PrivacyPolicy,
  TermsOfService,
  SubscriptionBlocked,
} from "./pages/common";

// Other pages
import NotFound from "./pages/NotFound";
import { OnboardingWizard } from "./components/onboarding";
import Layout from "./components/Layout";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";

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
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

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
              <OperatorTerminal />
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
        path="/admin/config/calendar"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <FactoryCalendar />
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
        path="/admin/organization/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <OrganizationSettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/scrap-reasons"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigScrapReasons />
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
        path="/admin/config/mqtt-publishers"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigMqttPublishers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/mcp-keys"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ConfigMcpKeys />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/mcp-server"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <McpServerSettings />
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
        path="/admin/data-import"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <DataImport />
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
        path="/admin/capacity"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <CapacityMatrix />
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
        path="/admin/shipping"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Shipments />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Analytics Routes */}
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AnalyticsDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/oee"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <OEEAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/reliability"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <ReliabilityAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/qrm"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <QRMAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/qrm-dashboard"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <QRMDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/jobs"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <JobsAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/quality"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <QualityAnalytics />
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

      {/* Public legal pages - must be accessible without authentication */}
      <Route
        path="/privacy-policy"
        element={
          <Layout>
            <PrivacyPolicy />
          </Layout>
        }
      />

      <Route
        path="/terms-of-service"
        element={
          <Layout>
            <TermsOfService />
          </Layout>
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
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationToastProvider>
              <McpActivityToasts />
              <AppRoutes />
            </NotificationToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
