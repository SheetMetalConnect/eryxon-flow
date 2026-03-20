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

  it("supports severity badges", () => {
    render(<SeverityBadge severity="critical" label="Critical" />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});
