import { fireEvent, render, screen } from "@/test/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUseProfile = vi.fn();
const mockUseSession = vi.fn();
const mockUseAuthActions = vi.fn();
const mockUseOperator = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

vi.mock("@/components/AnimatedBackground", () => ({
  default: () => <div data-testid="animated-background" />,
}));

vi.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import TerminalLogin from "./TerminalLogin";

describe("TerminalLogin", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseProfile.mockReturnValue({ role: "admin" });
    mockUseSession.mockReturnValue({ user: { id: "user-1" } });
    mockUseAuthActions.mockReturnValue({ loading: false });
    mockUseOperator.mockReturnValue({
      activeOperator: null,
      resumeOperator: {
        id: "operator-1",
        employee_id: "EMP001",
        full_name: "Alex Operator",
        tenant_id: "tenant-1",
      },
      lockReason: "idle_timeout",
      verifyAndSwitchOperator: vi.fn(),
      clearActiveOperator: vi.fn(),
    });
  });

  it("routes cached operators back through PIN entry instead of allowing PIN-less continue", () => {
    render(<TerminalLogin />);

    expect(screen.queryByText(/Continue as/i)).not.toBeInTheDocument();
    expect(screen.getByText("terminalLogin.idleTimeoutLocked")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /terminalLogin.reverifyAs/i }));

    expect(screen.getByText("EMP001")).toBeInTheDocument();
    expect(screen.getByText("terminalLogin.enterPin")).toBeInTheDocument();
  });
});
