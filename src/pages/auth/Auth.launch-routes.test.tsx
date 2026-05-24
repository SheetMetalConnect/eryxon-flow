import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const useProfileMock = vi.fn();
const useAuthActionsMock = vi.fn();
const useNativeMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => useProfileMock(),
}));
vi.mock("@/hooks/useAuthActions", () => ({
  useAuthActions: () => useAuthActionsMock(),
}));
vi.mock("@/hooks/useNative", () => ({
  useNative: () => useNativeMock(),
}));
vi.mock("@/components/auth/TurnstileWidget", () => ({
  TurnstileWidget: (): null => null,
  useTurnstile: (): {
    captchaToken: string | null;
    setCaptchaToken: ReturnType<typeof vi.fn>;
    resetKey: number;
    reset: ReturnType<typeof vi.fn>;
  } => ({
    captchaToken: null,
    setCaptchaToken: vi.fn(),
    resetKey: 0,
    reset: vi.fn(),
  }),
}));
vi.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div>Language</div>,
}));
vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AuthCardHeader: () => <div>Auth header</div>,
}));

import Auth from "./Auth";

describe("Auth launch routes", () => {
  beforeEach(() => {
    useProfileMock.mockReturnValue({ role: "operator" });
    useAuthActionsMock.mockReturnValue({
      signIn: vi.fn(),
      signUp: vi.fn(),
    });
    useNativeMock.mockReturnValue({
      isNative: false,
      isMobileShell: false,
    });
  });

  it("returns operators to the requested touch-first route after auth", async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/auth", state: { from: "/m/scan" } }]}
      >
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/m/scan" element={<div>Scan route</div>} />
          <Route path="/m/queue" element={<div>Mobile queue</div>} />
          <Route
            path="/operator/work-queue"
            element={<div>Desktop queue</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Scan route")).toBeInTheDocument();
    });
  });

  it("sends mobile-shell operators to /m/queue when there is no return target", async () => {
    useNativeMock.mockReturnValue({
      isNative: false,
      isMobileShell: true,
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/m/queue" element={<div>Mobile queue</div>} />
          <Route
            path="/operator/work-queue"
            element={<div>Desktop queue</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Mobile queue")).toBeInTheDocument();
    });
  });
});
