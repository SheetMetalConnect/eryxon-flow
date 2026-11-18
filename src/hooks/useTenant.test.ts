import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    tenant: { id: "t1", name: "Test Co", plan: "pro", status: "active",
      trial_ends_at: null as null, company_name: "Test Co",
      whitelabel_enabled: false, whitelabel_logo_url: null as null,
      whitelabel_app_name: null as null, whitelabel_primary_color: null as null,
      whitelabel_favicon_url: null as null },
    signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    switchTenant: vi.fn(), refreshTenant: vi.fn(),
  }),
}));

import { useTenant } from "./useTenant";

describe("useTenant", () => {
  it("returns tenant info and refreshTenant", () => {
    const { result } = renderHook(() => useTenant());
    expect(result.current.tenant?.id).toBe("t1");
    expect(result.current.tenant?.plan).toBe("pro");
    expect(typeof result.current.refreshTenant).toBe("function");
  });
});
