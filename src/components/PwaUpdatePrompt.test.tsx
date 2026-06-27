import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";

const mocks = vi.hoisted(() => ({
  isNativeApp: vi.fn(() => false),
  useRegisterSW: vi.fn(),
  toast: Object.assign(vi.fn(() => "toast-id"), {
    success: vi.fn(),
    loading: vi.fn(),
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

  it("auto-applies the update and shows an updating toast when a new version is ready", () => {
    const { updateServiceWorker } = mockRegisterSW({ needRefresh: true });
    render(<PwaUpdatePrompt />);

    // No manual tap: `true` posts SKIP_WAITING so the waiting SW activates and reloads.
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(mocks.toast.loading).toHaveBeenCalledWith("pwa.updating", expect.anything());
  });

  it("does not toast or update when there is nothing to announce", () => {
    const { updateServiceWorker } = mockRegisterSW();
    render(<PwaUpdatePrompt />);
    expect(mocks.toast.loading).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
