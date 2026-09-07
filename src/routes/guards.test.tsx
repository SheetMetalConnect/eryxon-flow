import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseProfile = vi.fn();
const mockUseSession = vi.fn();
const mockUseAuthActions = vi.fn();
const mockUseOperator = vi.fn();

vi.mock("@/hooks/useProfile", () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

vi.mock("@/hooks/useAuthActions", () => ({
  useAuthActions: (...args: unknown[]) => mockUseAuthActions(...args),
}));

vi.mock("@/contexts/OperatorContext", () => ({
  useOperator: (...args: unknown[]) => mockUseOperator(...args),
}));

import { ProtectedRoute } from "./guards";
import { MobileRoutes } from "./mobileRoutes";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}:{location.state?.from}</div>;
}

function renderProtectedRoute(initialEntry = "/operator/work-queue") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {MobileRoutes()}
        <Route
          path="/operator/work-queue"
          element={(
            <ProtectedRoute operatorOnly>
              <div>operator screen</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/operator/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ user: { id: "user-1" } });
    mockUseAuthActions.mockReturnValue({ loading: false });
    mockUseOperator.mockReturnValue({ activeOperator: null, isLoading: false });
  });

  it("allows admins/shift-leaders into operator views for oversight without a PIN", () => {
    mockUseProfile.mockReturnValue({ role: "admin" });

    renderProtectedRoute();

    expect(screen.getByText("operator screen")).toBeInTheDocument();
  });

  it("redirects a non-admin without a verified operator to PIN entry", () => {
    mockUseProfile.mockReturnValue({ role: "viewer" });

    renderProtectedRoute();

    expect(screen.getByTestId("location")).toHaveTextContent("/operator/login");
  });

  it("allows shared-terminal admins through when an operator is actively verified", () => {
    mockUseProfile.mockReturnValue({ role: "admin" });
    mockUseOperator.mockReturnValue({
      activeOperator: { id: "operator-1" },
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("operator screen")).toBeInTheDocument();
  });

  it.each(["/operator/work-queue?scan=1", "/m/queue?scan=1", "/m/scan"])("requires a verified employee for operator account at %s", (entry) => {
    mockUseProfile.mockReturnValue({ role: "operator" });
    renderProtectedRoute(entry);
    expect(screen.queryByText("operator screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/operator/login:/operator/work-queue?scan=1");
  });

  it("relocks the canonical queue when the PIN session expires", () => {
    mockUseProfile.mockReturnValue({ role: "operator" });
    mockUseOperator.mockReturnValue({ activeOperator: { id: "employee-1" }, isLoading: false });
    const view = renderProtectedRoute("/m/queue");
    expect(screen.getByText("operator screen")).toBeInTheDocument();
    mockUseOperator.mockReturnValue({ activeOperator: null, resumeOperator: { id: "employee-1" }, lockReason: "session_expired", isLoading: false });
    view.rerender(<MemoryRouter initialEntries={["/m/queue"]}><Routes>
      {MobileRoutes()}
      <Route path="/operator/work-queue" element={<ProtectedRoute operatorOnly><div>operator screen</div></ProtectedRoute>} />
      <Route path="/operator/login" element={<LocationProbe />} />
    </Routes></MemoryRouter>);
    expect(screen.queryByText("operator screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/operator/login:/operator/work-queue");
  });
});
