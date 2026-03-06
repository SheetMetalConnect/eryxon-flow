import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./guards";
import Layout from "@/components/Layout";
import { LazyRoute } from "./LazyRoute";

const WorkQueue = lazy(() => import("@/pages/operator/WorkQueue"));
const MyActivity = lazy(() => import("@/pages/operator/MyActivity"));
const MyIssues = lazy(() => import("@/pages/operator/MyIssues"));
const OperatorView = lazy(() => import("@/pages/operator/OperatorView"));

export function OperatorRoutes() {
  return (
    <>
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
    </>
  );
}
