import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OperatorProvider } from "./contexts/OperatorContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./components/NotificationToastProvider";
import { McpActivityToasts } from "./components/admin/McpActivityToasts";
import { ErrorBoundary, PageLoadingFallback } from "./components/ErrorBoundary";
import { AlphaBanner } from "./components/AlphaBanner";
import Layout from "./components/Layout";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";

// ============================================================================
// LAZY LOADED PAGES - Code splitting for better initial bundle size
// ============================================================================

// Auth pages (eagerly loaded as they're the entry point)
import { Auth, AcceptInvitation } from "./pages/auth";
import { TerminalLogin } from "./pages/operator";

// Operator pages - lazy loaded
const WorkQueue = lazy(() => import("./pages/operator/WorkQueue"));
const MyActivity = lazy(() => import("./pages/operator/MyActivity"));
const MyIssues = lazy(() => import("./pages/operator/MyIssues"));
const OperatorView = lazy(() => import("./pages/operator/OperatorView"));

// Admin pages - lazy loaded
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const IssueQueue = lazy(() => import("./pages/admin/IssueQueue"));
const ExceptionInbox = lazy(() => import("./pages/admin/ExceptionInbox"));
const ExpectationsView = lazy(() => import("./pages/admin/ExpectationsView"));
const FactoryCalendar = lazy(() => import("./pages/admin/FactoryCalendar"));
const OrganizationSettings = lazy(() => import("./pages/admin/OrganizationSettings"));
const Assignments = lazy(() => import("./pages/admin/Assignments"));
const McpServerSettings = lazy(() => import("./pages/admin/McpServerSettings"));
const McpSetup = lazy(() => import("./pages/admin/McpSetup"));
const DataExport = lazy(() => import("./pages/admin/DataExport"));
const DataImport = lazy(() => import("./pages/admin/DataImport"));
const Jobs = lazy(() => import("./pages/admin/Jobs"));
const JobCreate = lazy(() => import("./pages/admin/JobCreate"));
const Parts = lazy(() => import("./pages/admin/Parts"));
const ActivityMonitor = lazy(() => import("./pages/admin/ActivityMonitor").then(m => ({ default: m.ActivityMonitor })));
const CapacityMatrix = lazy(() => import("./pages/admin/CapacityMatrix"));
const Operations = lazy(() => import("./pages/admin/Operations").then(m => ({ default: m.Operations })));
const Settings = lazy(() => import("./pages/admin/Settings").then(m => ({ default: m.Settings })));
const IntegrationsMarketplace = lazy(() => import("./pages/admin/IntegrationsMarketplace"));
const Shipments = lazy(() => import("./pages/admin/Shipments"));
const Batches = lazy(() => import("./pages/admin/Batches"));
const StepsTemplatesView = lazy(() => import("./pages/admin/StepsTemplatesView"));
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));

// Admin config pages - lazy loaded
const ConfigApiKeys = lazy(() => import("./pages/admin/config/ApiKeys"));
const ConfigMaterials = lazy(() => import("./pages/admin/config/Materials"));
const ConfigMcpKeys = lazy(() => import("./pages/admin/config/McpKeys"));
const ConfigMqttPublishers = lazy(() => import("./pages/admin/config/MqttPublishers"));
const ConfigResources = lazy(() => import("./pages/admin/config/Resources"));
const ConfigScrapReasons = lazy(() => import("./pages/admin/config/ScrapReasons"));
const ConfigStages = lazy(() => import("./pages/admin/config/Stages"));
const ConfigUsers = lazy(() => import("./pages/admin/config/Users"));
const ConfigWebhooks = lazy(() => import("./pages/admin/config/Webhooks"));

// Admin analytics pages - lazy loaded
const OEEAnalytics = lazy(() => import("./pages/admin/analytics/OEEAnalytics"));
const ReliabilityAnalytics = lazy(() => import("./pages/admin/analytics/ReliabilityAnalytics"));
const QRMAnalytics = lazy(() => import("./pages/admin/analytics/QRMAnalytics"));
const QRMDashboard = lazy(() => import("./pages/admin/analytics/QRMDashboard"));
const JobsAnalytics = lazy(() => import("./pages/admin/analytics/JobsAnalytics"));
const QualityAnalytics = lazy(() => import("./pages/admin/analytics/QualityAnalytics"));

// Common pages - lazy loaded
const ApiDocs = lazy(() => import("./pages/common/ApiDocs"));
const Pricing = lazy(() => import("./pages/common/Pricing"));
const MyPlan = lazy(() => import("./pages/common/MyPlan"));
const Help = lazy(() => import("./pages/common/Help"));
const About = lazy(() => import("./pages/common/About"));
const PrivacyPolicy = lazy(() => import("./pages/common/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/common/TermsOfService"));

// Other pages
const NotFound = lazy(() => import("./pages/NotFound"));
const OnboardingWizard = lazy(() => import("./components/onboarding").then(m => ({ default: m.OnboardingWizard })));

// ============================================================================
// ROUTE PROTECTION
// ============================================================================

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

// ============================================================================
// ROUTE WRAPPER WITH SUSPENSE
// ============================================================================

/**
 * Wraps a lazy-loaded page with Suspense and ErrorBoundary
 */
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// ============================================================================
// APP ROUTES
// ============================================================================

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
              <LazyRoute>
                <WorkQueue />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator/my-activity"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <MyActivity />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator/my-issues"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <MyIssues />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator/view"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <OperatorView />
              </LazyRoute>
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
              <LazyRoute>
                <Dashboard />
              </LazyRoute>
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
              <LazyRoute>
                <ConfigStages />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/calendar"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <FactoryCalendar />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/materials"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigMaterials />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/resources"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigResources />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/users"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigUsers />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/organization/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <OrganizationSettings />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/scrap-reasons"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigScrapReasons />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/issues"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <IssueQueue />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/exceptions"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ExceptionInbox />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/expectations"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ExpectationsView />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Assignments />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/api-keys"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigApiKeys />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/webhooks"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigWebhooks />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/mqtt-publishers"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigMqttPublishers />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/mcp-keys"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ConfigMcpKeys />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/mcp-setup"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <McpSetup />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/mcp-server"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <McpServerSettings />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/data-export"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <DataExport />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/data-import"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <DataImport />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Jobs />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/jobs/new"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <JobCreate />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/parts"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Parts />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/activity"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ActivityMonitor />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/capacity"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <CapacityMatrix />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/operations"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Operations />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Settings />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/integrations"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <IntegrationsMarketplace />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/shipping"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Shipments />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/batches"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <Batches />
              </LazyRoute>
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
              <LazyRoute>
                <AnalyticsDashboard />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/oee"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <OEEAnalytics />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/reliability"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <ReliabilityAnalytics />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/qrm"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <QRMAnalytics />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/qrm-dashboard"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <QRMDashboard />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/jobs"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <JobsAnalytics />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics/quality"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <QualityAnalytics />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config/steps-templates"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <StepsTemplatesView />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/api-docs"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <ApiDocs />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/pricing"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <Pricing />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/my-plan"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <LazyRoute>
                <MyPlan />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/help"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <Help />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/about"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute>
                <About />
              </LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Public legal pages - must be accessible without authentication */}
      <Route
        path="/privacy-policy"
        element={
          <Layout>
            <LazyRoute>
              <PrivacyPolicy />
            </LazyRoute>
          </Layout>
        }
      />

      <Route
        path="/terms-of-service"
        element={
          <Layout>
            <LazyRoute>
              <TermsOfService />
            </LazyRoute>
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

      <Route path="*" element={
        <LazyRoute>
          <NotFound />
        </LazyRoute>
      } />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AlphaBanner />
        <Toaster />
        <Sonner />
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
