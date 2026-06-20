import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import Dashboard from "./Dashboard";

const {
  channelOn,
  channelSubscribe,
  removeChannel,
  fromMock,
} = vi.hoisted(() => ({
  channelOn: vi.fn(),
  channelSubscribe: vi.fn(),
  removeChannel: vi.fn(),
  fromMock: vi.fn(),
}));
let activeJobsBuilderForTest: MockBuilder;

interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: PromiseLike<unknown>["then"];
}

function createBuilder(
  result: unknown,
  terminal: "then" | "order" | "single" = "then",
): MockBuilder {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    then: undefined as unknown as PromiseLike<unknown>["then"],
  } as MockBuilder;

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lte.mockReturnValue(builder);
  builder.order.mockImplementation(() =>
    terminal === "order" ? Promise.resolve(result) : builder,
  );
  builder.single.mockImplementation(() =>
    terminal === "single" ? Promise.resolve(result) : builder,
  );
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    tenant_id: "tenant-1",
    role: "admin",
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    channel: vi.fn(() => ({
      on: channelOn,
      subscribe: channelSubscribe,
    })),
    removeChannel,
  },
}));

vi.mock("@/components/qrm/QRMDashboard", () => ({
  QRMDashboard: () => React.createElement("div", { "data-testid": "qrm-dashboard" }),
}));

vi.mock("@/lib/database", () => ({
  adminStopTimeTracking: vi.fn(),
  stopAllActiveTimeEntries: vi.fn(),
}));

vi.mock("@/lib/seed", () => ({
  seedDemoData: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Dashboard", () => {
  beforeEach(() => {
    channelOn.mockImplementation(function on() {
      return this;
    });
    channelSubscribe.mockReturnValue({ unsubscribe: vi.fn() });

    activeJobsBuilderForTest = createBuilder(
      {
        data: [
          {
            id: "job-1",
            job_number: "JOB-001",
            customer: "Acme",
            status: "in_progress",
            due_date: "2026-05-30T00:00:00.000Z",
            due_date_override: null,
            parts: [
              {
                operations: [{ status: "completed" }, { status: "in_progress" }],
              },
            ],
          },
          {
            id: "job-2",
            job_number: "JOB-002",
            customer: "Bravo",
            status: "not_started",
            due_date: "2026-06-02T00:00:00.000Z",
            due_date_override: null,
            parts: [
              {
                operations: [{ status: "completed" }],
              },
            ],
          },
        ],
        error: null,
      },
      "order",
    );

    const jobsCountBuilder = createBuilder({ count: 5, error: null });
    const jobsDueBuilder = createBuilder({ count: 2, error: null });
    let jobsCallCount = 0;
    let operationsCallCount = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === "time_entries") {
        return createBuilder({ data: [], error: null }, "order");
      }

      if (table === "operations") {
        operationsCallCount += 1;
        if (operationsCallCount === 1) {
          return createBuilder({ count: 1, error: null });
        }
        return createBuilder({ count: 7, error: null });
      }

      if (table === "jobs") {
        jobsCallCount += 1;
        if (jobsCallCount === 1) {
          return jobsDueBuilder;
        }
        if (jobsCallCount === 2) {
          return jobsCountBuilder;
        }
        return activeJobsBuilderForTest;
      }

      if (table === "cells") {
        return createBuilder({ count: 3, error: null });
      }

      if (table === "issues") {
        return createBuilder({ count: 4, error: null });
      }

      if (table === "parts") {
        return createBuilder({ count: 6, error: null });
      }

      if (table === "tenants") {
        return createBuilder(
          {
            data: {
              factory_closing_time: null,
              auto_stop_tracking: false,
            },
            error: null,
          },
          "single",
        );
      }

      throw new Error(`Unexpected table ${table}`);
    });

    vi.stubGlobal("setInterval", vi.fn(() => 1));
    vi.stubGlobal("clearInterval", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders active job progress for not-started and in-progress jobs", async () => {
    render(React.createElement(Dashboard));

    await waitFor(() => {
      expect(screen.getByText("dashboard.activeJobProgress")).toBeInTheDocument();
    });

    expect(screen.getByText("JOB-001")).toBeInTheDocument();
    expect(screen.getByText("JOB-002")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();

    expect(activeJobsBuilderForTest.in).toHaveBeenCalledWith("status", [
      "not_started",
      "in_progress",
    ]);

    const subscribedTables = channelOn.mock.calls.map((call) => call[1].table);
    expect(subscribedTables).toEqual(
      expect.arrayContaining(["time_entries", "operations", "jobs"]),
    );
  });
});
