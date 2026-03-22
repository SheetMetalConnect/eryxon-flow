import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Factory } from "lucide-react";
import { AuthCardHeader, AuthShell } from "./AuthShell";

vi.mock("@/components/AnimatedBackground", () => ({
  default: () => <div data-testid="animated-background" />,
}));

describe("AuthShell", () => {
  it("renders the shared background, top-right content, and auth card wrapper", () => {
    const { container } = render(
      <AuthShell topRight={<button type="button">Language</button>}>
        <div>Content</div>
      </AuthShell>,
    );

    expect(screen.getByTestId("animated-background")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(container.querySelector(".onboarding-card")).toBeInTheDocument();
  });
});

describe("AuthCardHeader", () => {
  it("renders the shared auth heading structure", () => {
    const { container } = render(
      <AuthCardHeader
        icon={Factory}
        eyebrow="Invited"
        appName="Eryxon Flow"
        badge="Preview"
        title="Join your team"
        description="Create your access and continue."
      />,
    );

    expect(screen.getByText("Invited")).toBeInTheDocument();
    expect(screen.getByText("Eryxon Flow")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Join your team" })).toBeInTheDocument();
    expect(screen.getByText("Create your access and continue.")).toBeInTheDocument();
    expect(container.querySelector("hr.title-divider")).toBeInTheDocument();
  });
});
