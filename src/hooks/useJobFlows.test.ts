import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock supabase
const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

import { useJobFlows } from "./useJobFlows";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function mockQuery(data: any[]) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ data, error: null }),
        in: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

describe("useJobFlows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when no jobIds", () => {
    const { result } = renderHook(() => useJobFlows([], "t1"), { wrapper: createWrapper() });
    expect(result.current.flows).toEqual({});
  });

  it("returns empty when no tenantId", () => {
    const { result } = renderHook(() => useJobFlows(["j1"], null), { wrapper: createWrapper() });
    expect(result.current.flows).toEqual({});
  });

  it("builds flow from 3 separate queries", async () => {
    const cells = [
      { id: "c1", name: "Laser", color: "#3b82f6", sequence: 0 },
      { id: "c2", name: "Kantbank", color: "#16a34a", sequence: 1 },
    ];
    const parts = [
      { id: "p1", job_id: "j1" },
      { id: "p2", job_id: "j1" },
    ];
    const operations = [
      { id: "op1", status: "completed", cell_id: "c1", part_id: "p1" },
      { id: "op2", status: "not_started", cell_id: "c2", part_id: "p1" },
      { id: "op3", status: "not_started", cell_id: "c1", part_id: "p2" },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "cells") return mockQuery(cells);
      if (table === "parts") return mockQuery(parts);
      if (table === "operations") return mockQuery(operations);
      return mockQuery([]);
    });

    const { result } = renderHook(() => useJobFlows(["j1"], "t1"), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(Object.keys(result.current.flows).length).toBeGreaterThan(0);
    });

    const flow = result.current.flows["j1"];
    expect(flow).toBeDefined();
    expect(flow).toHaveLength(2);
    expect(flow[0].cell_name).toBe("Laser");
    expect(flow[0].operation_count).toBe(2);
    expect(flow[0].completed_operations).toBe(1);
    expect(flow[1].cell_name).toBe("Kantbank");
    expect(flow[1].operation_count).toBe(1);
    expect(flow[1].completed_operations).toBe(0);
  });
});
