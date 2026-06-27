import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// The guards module pulls in auth hooks at import time; stub them so this
// test stays focused on the operator gate and never touches Supabase.
const useProfileMock = vi.fn();
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => useProfileMock() }));
vi.mock("@/hooks/useSession", () => ({
  useSession: (): { user: null } => ({ user: null }),
}));
vi.mock("@/hooks/useAuthActions", () => ({
  useAuthActions: (): { loading: boolean } => ({ loading: false }),
}));

const useOperatorMock = vi.fn();
vi.mock("@/contexts/OperatorContext", () => ({
  useOperator: () => useOperatorMock(),
}));

import { RequireActiveOperator, resolveOperatorGate } from "./guards";

describe("resolveOperatorGate", () => {
  it("waits while the operator context is hydrating", () => {
    expect(
      resolveOperatorGate({ isLoading: true, hasActiveOperator: false, isAdmin: false }),
    ).toBe("loading");
  });

  it("redirects a shared account with no active operator", () => {
    expect(
      resolveOperatorGate({ isLoading: false, hasActiveOperator: false, isAdmin: false }),
    ).toBe("redirect");
  });

  it("allows a verified active operator through", () => {
    expect(
      resolveOperatorGate({ isLoading: false, hasActiveOperator: true, isAdmin: false }),
    ).toBe("allow");
  });

  it("allows an admin through for oversight without a PIN'd operator", () => {
    expect(
      resolveOperatorGate({ isLoading: false, hasActiveOperator: false, isAdmin: true }),
    ).toBe("allow");
  });
});

function renderGate() {
  return render(
    <MemoryRouter initialEntries={["/m/queue"]}>
      <Routes>
        <Route
          path="/m/queue"
          element={
            <RequireActiveOperator>
              <div>Operator queue</div>
            </RequireActiveOperator>
          }
        />
        <Route path="/m/login" element={<div>PIN login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireActiveOperator", () => {
  beforeEach(() => {
    // Default: a non-admin shared account (no PIN'd operator).
    useProfileMock.mockReturnValue(null);
  });

  it("redirects to the PIN login when no operator is signed in", () => {
    useOperatorMock.mockReturnValue({ activeOperator: null, isLoading: false });
    renderGate();
    expect(screen.getByText("PIN login")).toBeInTheDocument();
    expect(screen.queryByText("Operator queue")).toBeNull();
  });

  it("lets an admin into the mobile shell without forcing the PIN login", () => {
    // Admins get oversight access without badging in as a shop-floor operator.
    useProfileMock.mockReturnValue({ role: "admin" });
    useOperatorMock.mockReturnValue({ activeOperator: null, isLoading: false });
    renderGate();
    expect(screen.getByText("Operator queue")).toBeInTheDocument();
    expect(screen.queryByText("PIN login")).toBeNull();
  });

  it("renders the operator surface when an operator is active", () => {
    useOperatorMock.mockReturnValue({
      activeOperator: {
        id: "op-1",
        employee_id: "E1",
        full_name: "Operator One",
        tenant_id: "t-1",
      },
      isLoading: false,
    });
    renderGate();
    expect(screen.getByText("Operator queue")).toBeInTheDocument();
    expect(screen.queryByText("PIN login")).toBeNull();
  });

  it("shows a spinner while the operator session is still loading", () => {
    useOperatorMock.mockReturnValue({ activeOperator: null, isLoading: true });
    renderGate();
    expect(screen.queryByText("Operator queue")).toBeNull();
    expect(screen.queryByText("PIN login")).toBeNull();
  });
});
