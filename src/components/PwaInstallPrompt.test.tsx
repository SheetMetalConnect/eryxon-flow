import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PwaInstallPrompt } from "./PwaInstallPrompt";

const mockIsNativeApp = vi.fn().mockReturnValue(false);
const mockIsStandalone = vi.fn().mockReturnValue(false);

vi.mock("@/native", () => ({
  isNativeApp: () => mockIsNativeApp(),
  isStandalone: () => mockIsStandalone(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "pwa.installTitle": "Install Eryxon Flow",
        "pwa.installDescription": "Install this app on your device for the best experience.",
        "pwa.install": "Install",
        "pwa.notNow": "Not now",
      };
      return map[key] ?? key;
    },
  }),
}));

afterEach(() => {
  localStorage.removeItem("eryxon_pwa_install_dismissed");
  mockIsNativeApp.mockReturnValue(false);
  mockIsStandalone.mockReturnValue(false);
});

function dispatchBeforeInstallPrompt() {
  const event = new Event("beforeinstallprompt", {
    bubbles: true,
    cancelable: true,
  }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => { window.dispatchEvent(event); });
  return event;
}

describe("PwaInstallPrompt", () => {
  it("renders nothing before beforeinstallprompt fires", () => {
    const { container } = render(<PwaInstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("shows the install banner after beforeinstallprompt fires", () => {
    render(<PwaInstallPrompt />);
    dispatchBeforeInstallPrompt();
    expect(screen.getByText("Install Eryxon Flow")).toBeInTheDocument();
    expect(screen.getByText("Install")).toBeInTheDocument();
  });

  it("calls prompt() when Install is clicked and dismisses", async () => {
    const user = userEvent.setup();
    render(<PwaInstallPrompt />);
    const event = dispatchBeforeInstallPrompt();

    await user.click(screen.getByText("Install"));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Install Eryxon Flow")).not.toBeInTheDocument();
  });

  it("dismisses on close button and persists", async () => {
    const user = userEvent.setup();
    render(<PwaInstallPrompt />);
    dispatchBeforeInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(localStorage.getItem("eryxon_pwa_install_dismissed")).toBe("true");
    expect(screen.queryByText("Install Eryxon Flow")).not.toBeInTheDocument();
  });

  it("renders nothing when already standalone", () => {
    mockIsStandalone.mockReturnValue(true);
    const { container } = render(<PwaInstallPrompt />);
    dispatchBeforeInstallPrompt();
    expect(container.innerHTML).toBe("");
  });
});
