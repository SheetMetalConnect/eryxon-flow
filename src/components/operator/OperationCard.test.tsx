import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test/utils";
import type { OperationWithDetails } from "@/lib/database";

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    id: "operator-1",
    tenant_id: "tenant-1",
  }),
}));

vi.mock("@/hooks/useOperationIssues", () => ({
  useOperationIssues: () => ({
    pendingCount: 0,
    highestSeverity: null,
  }),
}));

vi.mock("./OperationDetailModal", () => ({
  default: () => null,
}));

import OperationCard from "./OperationCard";

const baseOperation: OperationWithDetails = {
  id: "op-1",
  operation_name: "Brake",
  operation_type: null,
  sequence: 1,
  estimated_time: 120,
  actual_time: 30,
  updated_at: "2026-05-25T13:00:00.000Z",
  status: "not_started",
  completion_percentage: 0,
  notes: null,
  assigned_operator_id: null,
  cell_id: "cell-1",
  planned_start: "2026-05-25T08:00:00.000Z",
  part: {
    id: "part-1",
    part_number: "P-100",
    material: "Steel",
    quantity: 4,
    parent_part_id: null,
    file_paths: [],
    image_paths: [],
    drawing_no: null,
    cnc_program_name: null,
    is_bullet_card: false,
    job: {
      id: "job-1",
      job_number: "JOB-1",
      customer: null,
      due_date: "2026-05-30",
      due_date_override: null,
    },
  },
  cell: {
    id: "cell-1",
    name: "Brake",
    color: "#336699",
    sequence: 1,
  },
};

describe("OperationCard", () => {
  it("shows the handoff note indicator when notes exist", () => {
    render(
      React.createElement(OperationCard, {
        operation: { ...baseOperation, notes: "Check clamp position." },
        onUpdate: vi.fn(),
      }),
    );

    expect(
      screen.getByText("operations.handoffRemarks.hasNote"),
    ).toBeInTheDocument();
  });

  it("omits the handoff note indicator when no note exists", () => {
    render(
      React.createElement(OperationCard, {
        operation: baseOperation,
        onUpdate: vi.fn(),
      }),
    );

    expect(
      screen.queryByText("operations.handoffRemarks.hasNote"),
    ).not.toBeInTheDocument();
  });
});
