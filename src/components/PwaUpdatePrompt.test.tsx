import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";

const mocks = vi.hoisted(() => ({
  isNativeApp: vi.fn(() => false),
  useRegisterSW: vi.fn(),
  toast: Object.assign(vi.fn((_message: string, _options?: { action: { label: string; onClick: () => void } }) => "toast-id"), {
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
    vi.stubEnv("VITE_ENABLE_PWA", "true");
    mocks.isNativeApp.mockReturnValue(false);
  });

  it("does not register when PWA is disabled", () => {
    vi.stubEnv("VITE_ENABLE_PWA", "false");
    render(<PwaUpdatePrompt />);
    expect(mocks.useRegisterSW).not.toHaveBeenCalled();
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

  it("waits for an explicit reload before applying an update", () => {
    const { updateServiceWorker } = mockRegisterSW({ needRefresh: true });
    render(<PwaUpdatePrompt />);
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith("pwa.updateAvailable", expect.objectContaining({
      action: expect.objectContaining({ label: "pwa.reload", onClick: expect.any(Function) }),
    }));
    const options = mocks.toast.mock.calls[0][1];
    options?.action.onClick();
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("does not toast or update when there is nothing to announce", () => {
    const { updateServiceWorker } = mockRegisterSW();
    render(<PwaUpdatePrompt />);
    expect(mocks.toast.loading).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
