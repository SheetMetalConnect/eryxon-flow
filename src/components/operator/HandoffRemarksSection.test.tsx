import React from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test/utils";

const {
  mockUpdate,
  mockEq,
  mockFrom,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockFrom: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

import HandoffRemarksSection from "./HandoffRemarksSection";

describe("HandoffRemarksSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const builder = {
      error: null,
      eq: mockEq,
    };

    mockUpdate.mockReturnValue(builder);
    mockEq.mockReturnValue(builder);
    mockFrom.mockReturnValue({
      update: mockUpdate,
    });
  });

  it("saves the edited handoff remark", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    render(
      React.createElement(HandoffRemarksSection, {
        operationId: "op-1",
        tenantId: "tenant-1",
        note: null,
        updatedAt: null,
        onSaved,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /operations\.handoffRemarks\.add/i,
      }),
    );
    await user.type(
      screen.getByRole("textbox"),
      "Inspect fixture before restart",
    );
    await user.click(
      screen.getByRole("button", {
        name: /operations\.handoffRemarks\.save/i,
      }),
    );

    expect(mockFrom).toHaveBeenCalledWith("operations");
    expect(mockUpdate).toHaveBeenCalledWith({
      notes: "Inspect fixture before restart",
    });
    expect(mockEq).toHaveBeenNthCalledWith(1, "id", "op-1");
    expect(mockEq).toHaveBeenNthCalledWith(2, "tenant_id", "tenant-1");
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "operations.handoffRemarks.saved",
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("truncates long input and shows validation feedback", () => {
    render(
      React.createElement(HandoffRemarksSection, {
        operationId: "op-1",
        tenantId: "tenant-1",
        note: null,
        updatedAt: null,
        onSaved: vi.fn(),
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /operations\.handoffRemarks\.add/i,
      }),
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "a".repeat(281) } });

    expect(textarea).toHaveValue("a".repeat(280));
    expect(
      screen.getByText("operations.handoffRemarks.limitReached"),
    ).toBeInTheDocument();
    expect(screen.getByText("280/280")).toBeInTheDocument();
  });
});
