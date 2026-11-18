import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const useProfileMock = vi.fn();
const useAuthActionsMock = vi.fn();

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

  it("uses the same operator queue on every viewport when no return target exists", async () => {

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
      expect(screen.getByText("Desktop queue")).toBeInTheDocument();
    });
  });
});
