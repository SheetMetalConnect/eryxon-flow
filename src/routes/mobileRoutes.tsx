import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { ProtectedRoute, RequireActiveOperator } from "./guards";
import { LazyRoute } from "./LazyRoute";
import { MobileShell } from "@/components/mobile";

const MobileQueue = lazy(() => import("@/pages/mobile/MobileQueue"));
const MobileOperationDetail = lazy(
  () => import("@/pages/mobile/MobileOperationDetail"),
);
const MobileScanner = lazy(() => import("@/pages/mobile/MobileScanner"));
const MobileActivity = lazy(() => import("@/pages/mobile/MobileActivity"));
const MobileIssues = lazy(() => import("@/pages/mobile/MobileIssues"));
const MobileTerminal = lazy(() => import("@/pages/mobile/MobileTerminal"));
const MobileLogin = lazy(() => import("@/pages/mobile/MobileLogin"));

/**
 * Mobile / iOS native shell routes. Mounted under `/m` so the existing
 * desktop URLs still work — operators who prefer the desktop terminal can
 * keep using it, the iOS app simply launches into `/m/queue` instead.
 */
export function MobileRoutes() {
  return (
    <>
      <Route path="/m/login" element={<LazyRoute><MobileLogin /></LazyRoute>} />
      <Route
        path="/m"
        element={
          <ProtectedRoute>
            <RequireActiveOperator>
              <MobileShell />
            </RequireActiveOperator>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/m/queue" replace />} />
        <Route path="queue" element={<LazyRoute><MobileQueue /></LazyRoute>} />
        <Route
          path="op/:operationId"
          element={<LazyRoute><MobileOperationDetail /></LazyRoute>}
        />
        <Route path="scan" element={<LazyRoute><MobileScanner /></LazyRoute>} />
        <Route path="activity" element={<LazyRoute><MobileActivity /></LazyRoute>} />
        <Route path="issues" element={<LazyRoute><MobileIssues /></LazyRoute>} />
        <Route path="terminal" element={<LazyRoute><MobileTerminal /></LazyRoute>} />
      </Route>
    </>
  );
}
