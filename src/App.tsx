import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import WorkQueue from "./pages/operator/WorkQueue";
import MyActivity from "./pages/operator/MyActivity";
import MyIssues from "./pages/operator/MyIssues";
import Dashboard from "./pages/admin/Dashboard";
import IssueQueue from "./pages/admin/IssueQueue";
import ConfigStages from "./pages/admin/ConfigStages";
import ConfigUsers from "./pages/admin/ConfigUsers";
import Assignments from "./pages/admin/Assignments";
import ConfigApiKeys from "./pages/admin/ConfigApiKeys";
import ConfigWebhooks from "./pages/admin/ConfigWebhooks";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
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
        path="/"
        element={
          <Navigate
            to={profile?.role === "admin" ? "/dashboard" : "/work-queue"}
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
        path="/admin/users"
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
        path="/api-docs"
        element={
          <ProtectedRoute>
            <ApiDocs />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
