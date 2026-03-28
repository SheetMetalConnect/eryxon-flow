import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: null, tenant: null, loading: false,
    user: { id: "u1", email: "test@test.com" },
    session: { access_token: "tok-123", refresh_token: "ref-456" },
    signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    switchTenant: vi.fn(), refreshTenant: vi.fn(),
  }),
}));

import { useSession } from "./useSession";

describe("useSession", () => {
  it("returns user and session from auth context", () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.user).toEqual(expect.objectContaining({ id: "u1" }));
    expect(result.current.session).toEqual(expect.objectContaining({ access_token: "tok-123" }));
  });

  it("does not expose profile, tenant, or auth actions", () => {
    const { result } = renderHook(() => useSession());
    const keys = Object.keys(result.current);
    expect(keys).toEqual(["user", "session"]);
  });
});
