import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/utils";
import { SeverityBadge, StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders a translated label with icon by default", () => {
    render(<StatusBadge status="active" label="In progress" />);

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("In progress").closest("span")?.querySelector("svg")).toBeInTheDocument();
  });

  it("renders approved and rejected variants", () => {
    const { rerender } = render(<StatusBadge status="approved" />);
    expect(screen.getByText("approved")).toBeInTheDocument();

    rerender(<StatusBadge status="rejected" />);
    expect(screen.getByText("rejected")).toBeInTheDocument();
  });

  it("renders additional status variants and supports iconless output", () => {
    const { rerender } = render(<StatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();

    rerender(<StatusBadge status="completed" />);
    expect(screen.getByText("completed")).toBeInTheDocument();

    rerender(<StatusBadge status="on-hold" />);
    expect(screen.getByText("on hold")).toBeInTheDocument();

    rerender(<StatusBadge status="cancelled" showIcon={false} />);
    const badge = screen.getByText("cancelled").closest("span");
    expect(badge?.querySelector("svg")).not.toBeInTheDocument();
  });

  it("applies size and custom className variants", () => {
    const { rerender } = render(
      <StatusBadge status="active" size="sm" className="custom-badge" />,
    );

    expect(screen.getByText("active").closest("span")).toHaveClass(
      "text-[10px]",
      "px-1.5",
      "py-0.5",
      "custom-badge",
    );

    rerender(<SeverityBadge severity="high" size="lg" label="High" />);
    expect(screen.getByText("High").closest("span")).toHaveClass(
      "text-sm",
      "px-2.5",
      "py-1",
    );
  });

  it("supports severity badges", () => {
    render(<SeverityBadge severity="critical" label="Critical" />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});
