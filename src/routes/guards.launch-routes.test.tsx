import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const useProfileMock = vi.fn();
const useSessionMock = vi.fn();
const useAuthActionsMock = vi.fn();
const useOperatorMock = vi.fn();
const useNativeMock = vi.fn();

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => useProfileMock(),
}));
vi.mock("@/hooks/useSession", () => ({
  useSession: () => useSessionMock(),
}));
vi.mock("@/hooks/useAuthActions", () => ({
  useAuthActions: () => useAuthActionsMock(),
}));
vi.mock("@/contexts/OperatorContext", () => ({
  useOperator: () => useOperatorMock(),
}));
vi.mock("@/hooks/useNative", () => ({
  useNative: () => useNativeMock(),
}));

import { ProtectedRoute, RequireActiveOperator } from "./guards";

function AuthProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "none";
  return <div>auth:{from}</div>;
}

function MobileLoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "none";
  return <div>mobile-login:{from}</div>;
}

describe("launch route guards", () => {
  beforeEach(() => {
    useAuthActionsMock.mockReturnValue({ loading: false });
    useSessionMock.mockReturnValue({ user: { id: "user-1" } });
    useProfileMock.mockReturnValue({ role: "operator" });
    useOperatorMock.mockReturnValue({ activeOperator: null, isLoading: false });
    useNativeMock.mockReturnValue({
      isNative: false,
      isMobileShell: false,
    });
  });

  it("preserves the requested /m target when auth redirects to /auth", () => {
    useSessionMock.mockReturnValue({ user: null });
    useProfileMock.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/m/scan?scan=1"]}>
        <Routes>
          <Route
            path="/m/scan"
            element={
              <ProtectedRoute>
                <div>Protected scan</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<AuthProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("auth:/m/scan?scan=1")).toBeInTheDocument();
  });

  it("redirects mobile operators away from admin routes into the touch shell", () => {
    useNativeMock.mockReturnValue({
      isNative: true,
      isMobileShell: true,
    });

    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <div>Admin dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/m/queue" element={<div>Mobile queue</div>} />
          <Route
            path="/operator/work-queue"
            element={<div>Desktop queue</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Mobile queue")).toBeInTheDocument();
  });

  it("preserves the requested /m target when the operator gate sends users to /m/login", () => {
    render(
      <MemoryRouter initialEntries={["/m/activity"]}>
        <Routes>
          <Route
            path="/m/activity"
            element={
              <RequireActiveOperator>
                <div>Mobile activity</div>
              </RequireActiveOperator>
            }
          />
          <Route path="/m/login" element={<MobileLoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("mobile-login:/m/activity")).toBeInTheDocument();
  });
});
