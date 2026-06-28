import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/utils";
import { OperationTimeSummary } from "./OperationTimeSummary";
import type { OperationBookedHours } from "@/hooks/useOperationBookedHours";

function booked(overrides: Partial<OperationBookedHours> = {}): OperationBookedHours {
  return {
    entries: [],
    totalMinutes: 0,
    activeCount: 0,
    plannedVsBooked: {
      plannedMinutes: 0,
      bookedMinutes: 0,
      varianceMinutes: 0,
      isOverScheduled: false,
    },
    isLoading: false,
    ...overrides,
  };
}

// i18n is stubbed in tests to echo the key, so assertions match on the keys.
describe("OperationTimeSummary", () => {
  it("shows booked vs budget and the remaining time when under budget", () => {
    render(
      <OperationTimeSummary
        t={((k: string, d?: string) => d ?? k) as never}
        booked={booked({
          totalMinutes: 30,
          plannedVsBooked: {
            plannedMinutes: 72,
            bookedMinutes: 30,
            varianceMinutes: -42,
            isOverScheduled: false,
          },
        })}
      />,
    );
    expect(screen.getByText("30m")).toBeInTheDocument();
    expect(screen.getByText("1h 12m")).toBeInTheDocument(); // budget
    expect(screen.getByText(/of budget left/)).toBeInTheDocument();
  });

  it("flags over budget", () => {
    render(
      <OperationTimeSummary
        t={((k: string, d?: string) => d ?? k) as never}
        booked={booked({
          totalMinutes: 100,
          plannedVsBooked: {
            plannedMinutes: 72,
            bookedMinutes: 100,
            varianceMinutes: 28,
            isOverScheduled: true,
          },
        })}
      />,
    );
    expect(screen.getByText(/28m over budget/)).toBeInTheDocument(); // variance + label
  });

  it("rolls time entries up per operator, newest minutes summed", () => {
    render(
      <OperationTimeSummary
        t={((k: string, d?: string) => d ?? k) as never}
        booked={booked({
          totalMinutes: 90,
          activeCount: 1,
          entries: [
            { id: "a", operator_id: "op-1", operator_name: "Jan", minutes: 50, isActive: true, operation_id: "x", duration: 50, start_time: "", end_time: null },
            { id: "b", operator_id: "op-1", operator_name: "Jan", minutes: 10, isActive: false, operation_id: "x", duration: 10, start_time: "", end_time: "" },
            { id: "c", operator_id: "op-2", operator_name: "Eva", minutes: 30, isActive: false, operation_id: "x", duration: 30, start_time: "", end_time: "" },
          ],
          plannedVsBooked: {
            plannedMinutes: 120,
            bookedMinutes: 90,
            varianceMinutes: -30,
            isOverScheduled: false,
          },
        })}
      />,
    );
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument(); // Jan 50+10 = 60m
    expect(screen.getByText("Eva")).toBeInTheDocument();
    expect(screen.getByText("30m")).toBeInTheDocument();
  });
});
