import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";

const mocks = vi.hoisted(() => ({
  isNativeApp: vi.fn(() => false),
  useRegisterSW: vi.fn(),
  toast: Object.assign(vi.fn(() => "toast-id"), {
    success: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/native", () => ({ isNativeApp: mocks.isNativeApp }));
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: mocks.useRegisterSW,
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function mockRegisterSW({
  offlineReady = false,
  needRefresh = false,
}: { offlineReady?: boolean; needRefresh?: boolean } = {}) {
  const setOfflineReady = vi.fn();
  const setNeedRefresh = vi.fn();
  const updateServiceWorker = vi.fn(() => Promise.resolve());
  mocks.useRegisterSW.mockReturnValue({
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  });
  return { setOfflineReady, setNeedRefresh, updateServiceWorker };
}

describe("PwaUpdatePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativeApp.mockReturnValue(false);
  });

  it("never registers the service worker inside the native shell", () => {
    mocks.isNativeApp.mockReturnValue(true);
    mockRegisterSW();
    render(<PwaUpdatePrompt />);
    expect(mocks.useRegisterSW).not.toHaveBeenCalled();
  });

  it("registers the service worker on the web", () => {
    mockRegisterSW();
    render(<PwaUpdatePrompt />);
    expect(mocks.useRegisterSW).toHaveBeenCalledTimes(1);
  });

  it("announces offline readiness once and resets the flag", () => {
    const { setOfflineReady } = mockRegisterSW({ offlineReady: true });
    render(<PwaUpdatePrompt />);
    expect(mocks.toast.success).toHaveBeenCalledWith("pwa.offlineReady");
    expect(setOfflineReady).toHaveBeenCalledWith(false);
  });

  it("shows a persistent update toast whose action activates the new SW", () => {
    const { updateServiceWorker } = mockRegisterSW({ needRefresh: true });
    render(<PwaUpdatePrompt />);

    expect(mocks.toast).toHaveBeenCalledTimes(1);
    const [message, options] = mocks.toast.mock.calls[0];
    expect(message).toBe("pwa.updateAvailable");
    // Infinity duration: the prompt must survive until the operator decides.
    expect(options.duration).toBe(Infinity);

    options.action.onClick();
    // `true` posts SKIP_WAITING so the waiting SW activates and reloads.
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("lets the operator defer the update without activating it", () => {
    const { setNeedRefresh, updateServiceWorker } = mockRegisterSW({
      needRefresh: true,
    });
    render(<PwaUpdatePrompt />);

    const [, options] = mocks.toast.mock.calls[0];
    options.cancel.onClick();
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it("does not toast when there is nothing to announce", () => {
    mockRegisterSW();
    render(<PwaUpdatePrompt />);
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });
});
