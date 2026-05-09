import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MobileShell } from "./MobileShell";

// Tighten the test surface — the shell talks to a lot of providers but for a
// smoke test we only care that it renders the right chrome on the right
// route. Stub anything that needs a real Supabase / theme context.
vi.mock("@/hooks/usePendingIssuesCount", () => ({
  usePendingIssuesCount: () => ({ count: 0, isLoading: false }),
}));
vi.mock("@/theme/ThemeProvider", () => ({
  useThemeMode: () => ({ resolvedTheme: "dark", mode: "auto" }),
}));
vi.mock("@/hooks/useNative", () => ({
  useNative: () => ({
    platform: "web",
    isNative: false,
    isNativeIOS: false,
    isAndroidNative: false,
    isIPad: false,
    isIPhone: false,
    isMobileShell: true,
    hasFinePointer: false,
  }),
}));
vi.mock("@/hooks/useHardwareBack", () => ({
  useHardwareBack: (): void => undefined,
}));
vi.mock("@/native", () => ({
  hideSplash: vi.fn(),
  isAndroidNative: () => false,
  setStatusBarStyle: vi.fn(),
}));
vi.mock("./OfflineBanner", () => ({
  OfflineBanner: () => <div data-testid="offline-banner" />,
}));

function renderAt(initialPath: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/m/*" element={<MobileShell />}>
            <Route path="queue" element={<div>Queue page</div>} />
            <Route path="scan" element={<div>Scan page</div>} />
            <Route path="login" element={<div>Login page</div>} />
            <Route path="terminal" element={<div>Terminal page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MobileShell", () => {
  it("renders the bottom tab bar on /m/queue", () => {
    renderAt("/m/queue");
    expect(screen.getByText("Queue page")).toBeInTheDocument();
    // Tab labels — fall through to inline English fallbacks since the
    // i18n provider isn't wired in this isolated test.
    expect(screen.getByRole("navigation", { name: /Primary/i })).toBeInTheDocument();
  });

  it("hides the tab bar on full-screen routes (/m/scan)", () => {
    renderAt("/m/scan");
    expect(screen.getByText("Scan page")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /Primary/i }),
    ).toBeNull();
  });

  it("hides the tab bar on the login route (/m/login)", () => {
    renderAt("/m/login");
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /Primary/i }),
    ).toBeNull();
  });
});
