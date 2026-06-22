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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/operator/work-queue"]}>
      <Routes>
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

  it("redirects shared-terminal admins back to PIN entry when no operator is verified", () => {
    mockUseProfile.mockReturnValue({ role: "admin" });

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

  it("allows email-auth operators through without a separate terminal verification", () => {
    mockUseProfile.mockReturnValue({ role: "operator" });

    renderProtectedRoute();

    expect(screen.getByText("operator screen")).toBeInTheDocument();
  });
});
