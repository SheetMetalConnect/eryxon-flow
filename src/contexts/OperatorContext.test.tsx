import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OPERATOR_IDLE_TIMEOUT_MS,
  OPERATOR_RESUME_STORAGE_KEY,
  OPERATOR_SESSION_CHECK_INTERVAL_MS,
} from "./operatorSession";

const mockTenant = { id: "tenant-1" };
const mockProfile = {
  id: "admin-1",
  tenant_id: "tenant-1",
  role: "admin" as const,
  full_name: "Shared Terminal",
  active: true,
  is_machine: false,
  is_root_admin: false,
};

const mockUseProfile = vi.fn(() => mockProfile);
const mockUseTenant = vi.fn(() => ({ tenant: mockTenant }));
const mockRpc = vi.fn();

vi.mock("@/hooks/useProfile", () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));

vi.mock("@/hooks/useTenant", () => ({
  useTenant: (...args: unknown[]) => mockUseTenant(...args),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { OperatorProvider, useOperator } from "./OperatorContext";

function wrapper({ children }: { children: ReactNode }) {
  return <OperatorProvider>{children}</OperatorProvider>;
}

describe("OperatorContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockUseProfile.mockReturnValue(mockProfile);
    mockUseTenant.mockReturnValue({ tenant: mockTenant });
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates only a non-authorizing resume marker from session storage", async () => {
    sessionStorage.setItem(
      OPERATOR_RESUME_STORAGE_KEY,
      JSON.stringify({
        id: "operator-1",
        employee_id: "EMP001",
        full_name: "Alex Operator",
        tenant_id: "tenant-1",
      }),
    );

    const { result } = renderHook(() => useOperator(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeOperator).toBeNull();
    expect(result.current.resumeOperator).toEqual({
      id: "operator-1",
      employee_id: "EMP001",
      full_name: "Alex Operator",
      tenant_id: "tenant-1",
    });
  });

  it("relocks operator access after the idle timeout while keeping the resume marker", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          success: true,
          operator_id: "operator-1",
          employee_id: "EMP001",
          full_name: "Alex Operator",
          tenant_id: "tenant-1",
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useOperator(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.useFakeTimers();

    await act(async () => {
      await result.current.verifyAndSwitchOperator("EMP001", "1234");
    });

    expect(result.current.activeOperator?.employee_id).toBe("EMP001");
    expect(result.current.resumeOperator?.employee_id).toBe("EMP001");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        OPERATOR_IDLE_TIMEOUT_MS + OPERATOR_SESSION_CHECK_INTERVAL_MS + 1000,
      );
    });

    expect(result.current.activeOperator).toBeNull();
    expect(result.current.resumeOperator?.employee_id).toBe("EMP001");
    expect(result.current.lockReason).toBe("idle_timeout");
  });
});
