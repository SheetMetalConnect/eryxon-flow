import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./guards";
import Layout from "@/components/Layout";
import { LazyRoute } from "./LazyRoute";

// Admin pages
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const IssueQueue = lazy(() => import("@/pages/admin/IssueQueue"));
const FactoryCalendar = lazy(() => import("@/pages/admin/FactoryCalendar"));
const OrganizationSettings = lazy(() => import("@/pages/admin/OrganizationSettings"));
const Assignments = lazy(() => import("@/pages/admin/Assignments"));
const McpServerSettings = lazy(() => import("@/pages/admin/McpServerSettings"));
const McpSetup = lazy(() => import("@/pages/admin/McpSetup"));
const DataExport = lazy(() => import("@/pages/admin/DataExport"));
const DataImport = lazy(() => import("@/pages/admin/DataImport"));
const Jobs = lazy(() => import("@/pages/admin/Jobs"));
const JobCreate = lazy(() => import("@/pages/admin/JobCreate"));
const Parts = lazy(() => import("@/pages/admin/Parts"));
const PartCreate = lazy(() => import("@/pages/admin/PartCreate"));
const Batches = lazy(() => import("@/pages/admin/Batches"));
const BatchCreate = lazy(() => import("@/pages/admin/BatchCreate"));
const BatchDetail = lazy(() => import("@/pages/admin/BatchDetail"));
const ActivityMonitor = lazy(() => import("@/pages/admin/ActivityMonitor").then(m => ({ default: m.ActivityMonitor })));
const CapacityMatrix = lazy(() => import("@/pages/admin/CapacityMatrix"));
const Operations = lazy(() => import("@/pages/admin/Operations").then(m => ({ default: m.Operations })));
const Settings = lazy(() => import("@/pages/admin/Settings").then(m => ({ default: m.Settings })));
const StepsTemplatesView = lazy(() => import("@/pages/admin/StepsTemplatesView"));

// Admin config pages
const ConfigApiKeys = lazy(() => import("@/pages/admin/config/ApiKeys"));
const ConfigMaterials = lazy(() => import("@/pages/admin/config/Materials"));
const ConfigMcpKeys = lazy(() => import("@/pages/admin/config/McpKeys"));
const ConfigMqttPublishers = lazy(() => import("@/pages/admin/config/MqttPublishers"));
const ConfigResources = lazy(() => import("@/pages/admin/config/Resources"));
const ConfigScrapReasons = lazy(() => import("@/pages/admin/config/ScrapReasons"));
const ConfigStages = lazy(() => import("@/pages/admin/config/Stages"));
const ConfigUsers = lazy(() => import("@/pages/admin/config/Users"));
const ConfigWebhooks = lazy(() => import("@/pages/admin/config/Webhooks"));

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <LazyRoute>{children}</LazyRoute>
      </Layout>
    </ProtectedRoute>
  );
}

export function AdminRoutes() {
  return (
    <>
      <Route path="/admin/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/admin/config/stages" element={<AdminRoute><ConfigStages /></AdminRoute>} />
      <Route path="/admin/config/calendar" element={<AdminRoute><FactoryCalendar /></AdminRoute>} />
      <Route path="/admin/config/materials" element={<AdminRoute><ConfigMaterials /></AdminRoute>} />
      <Route path="/admin/config/resources" element={<AdminRoute><ConfigResources /></AdminRoute>} />
      <Route path="/admin/config/users" element={<AdminRoute><ConfigUsers /></AdminRoute>} />
      <Route path="/admin/organization/settings" element={<AdminRoute><OrganizationSettings /></AdminRoute>} />
      <Route path="/admin/config/scrap-reasons" element={<AdminRoute><ConfigScrapReasons /></AdminRoute>} />
      <Route path="/admin/issues" element={<AdminRoute><IssueQueue /></AdminRoute>} />
      <Route path="/admin/assignments" element={<AdminRoute><Assignments /></AdminRoute>} />
      <Route path="/admin/config/api-keys" element={<AdminRoute><ConfigApiKeys /></AdminRoute>} />
      <Route path="/admin/config/webhooks" element={<AdminRoute><ConfigWebhooks /></AdminRoute>} />
      <Route path="/admin/config/mqtt-publishers" element={<AdminRoute><ConfigMqttPublishers /></AdminRoute>} />
      <Route path="/admin/config/mcp-keys" element={<AdminRoute><ConfigMcpKeys /></AdminRoute>} />
      <Route path="/admin/mcp-setup" element={<AdminRoute><McpSetup /></AdminRoute>} />
      <Route path="/admin/config/mcp-server" element={<AdminRoute><McpServerSettings /></AdminRoute>} />
      <Route path="/admin/data-export" element={<AdminRoute><DataExport /></AdminRoute>} />
      <Route path="/admin/data-import" element={<AdminRoute><DataImport /></AdminRoute>} />
      <Route path="/admin/jobs" element={<AdminRoute><Jobs /></AdminRoute>} />
      <Route path="/admin/jobs/new" element={<AdminRoute><JobCreate /></AdminRoute>} />
      <Route path="/admin/parts" element={<AdminRoute><Parts /></AdminRoute>} />
      <Route path="/admin/parts/new" element={<AdminRoute><PartCreate /></AdminRoute>} />
      <Route path="/admin/batches" element={<AdminRoute><Batches /></AdminRoute>} />
      <Route path="/admin/batches/new" element={<AdminRoute><BatchCreate /></AdminRoute>} />
      <Route path="/admin/batches/:id" element={<AdminRoute><BatchDetail /></AdminRoute>} />
      <Route path="/admin/batches/:id/edit" element={<AdminRoute><BatchCreate /></AdminRoute>} />
      <Route path="/admin/activity" element={<AdminRoute><ActivityMonitor /></AdminRoute>} />
      <Route path="/admin/capacity" element={<AdminRoute><CapacityMatrix /></AdminRoute>} />
      <Route path="/admin/operations" element={<AdminRoute><Operations /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />
      <Route path="/admin/config/steps-templates" element={<AdminRoute><StepsTemplatesView /></AdminRoute>} />
      <Route path="/admin/my-plan" element={<AdminRoute><MyPlan /></AdminRoute>} />

      {/* Legacy admin redirects */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/stages" element={<Navigate to="/admin/config/stages" replace />} />
      <Route path="/admin/materials" element={<Navigate to="/admin/config/materials" replace />} />
      <Route path="/admin/resources" element={<Navigate to="/admin/config/resources" replace />} />
      <Route path="/admin/users" element={<Navigate to="/admin/config/users" replace />} />
    </>
  );
}

// Common pages accessible to all authenticated users
const ApiDocs = lazy(() => import("@/pages/common/ApiDocs"));
const Pricing = lazy(() => import("@/pages/common/Pricing"));
const MyPlan = lazy(() => import("@/pages/common/MyPlan"));
const About = lazy(() => import("@/pages/common/About"));
const PrivacyPolicy = lazy(() => import("@/pages/common/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/common/TermsOfService"));

export function CommonRoutes() {
  return (
    <>
      <Route
        path="/admin/api-docs"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute><ApiDocs /></LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pricing"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute><Pricing /></LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/about"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyRoute><About /></LazyRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Public legal pages - accessible without authentication */}
      <Route path="/privacy-policy" element={<Layout><LazyRoute><PrivacyPolicy /></LazyRoute></Layout>} />
      <Route path="/terms-of-service" element={<Layout><LazyRoute><TermsOfService /></LazyRoute></Layout>} />

      {/* Legacy common redirects */}
      <Route path="/api-docs" element={<Navigate to="/admin/api-docs" replace />} />
      <Route path="/pricing" element={<Navigate to="/admin/pricing" replace />} />
      <Route path="/my-plan" element={<Navigate to="/admin/my-plan" replace />} />
    </>
  );
}
