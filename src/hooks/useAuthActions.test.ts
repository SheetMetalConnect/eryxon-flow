import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockSwitchTenant = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: null, tenant: null, user: null, session: null,
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
    switchTenant: mockSwitchTenant,
    refreshTenant: vi.fn(),
  }),
}));

import { useAuthActions } from "./useAuthActions";

describe("useAuthActions", () => {
  it("returns auth mutation functions and loading state", () => {
    const { result } = renderHook(() => useAuthActions());
    expect(result.current.signIn).toBe(mockSignIn);
    expect(result.current.signUp).toBe(mockSignUp);
    expect(result.current.signOut).toBe(mockSignOut);
    expect(result.current.switchTenant).toBe(mockSwitchTenant);
    expect(result.current.loading).toBe(false);
  });

  it("does not expose profile, tenant, user, or session", () => {
    const { result } = renderHook(() => useAuthActions());
    const keys = Object.keys(result.current);
    expect(keys).toEqual(["signIn", "signUp", "signOut", "switchTenant", "loading"]);
  });
});
