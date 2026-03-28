import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "u1", tenant_id: "t1", username: "testuser", role: "admin", full_name: "Test User", email: "test@test.com", active: true, is_machine: false, is_root_admin: false },
    tenant: null, user: null, session: null, loading: false,
    signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), switchTenant: vi.fn(), refreshTenant: vi.fn(),
  }),
}));

import { useProfile } from "./useProfile";

describe("useProfile", () => {
  it("returns only the profile from auth context", () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current).toEqual(expect.objectContaining({ id: "u1", username: "testuser" }));
  });
});
