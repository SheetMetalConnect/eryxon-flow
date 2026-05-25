import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const verifyAndSwitchOperatorMock = vi.fn();
const hapticsMock = {
  success: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  light: vi.fn().mockResolvedValue(undefined),
  selection: vi.fn().mockResolvedValue(undefined),
};
const getBiometricAvailabilityMock = vi
  .fn()
  .mockResolvedValue({ available: false, kind: "none" });

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));
vi.mock("@/contexts/OperatorContext", () => ({
  useOperator: () => ({
    verifyAndSwitchOperator: verifyAndSwitchOperatorMock,
  }),
}));
vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => hapticsMock,
}));
vi.mock("@/components/terminal/PinKeypad", () => ({
  PinKeypad: ({
    onChange,
    onSubmit,
  }: {
    onChange: (value: string) => void;
    onSubmit: () => void;
  }) => (
    <>
      <button type="button" onClick={() => onChange("1234")}>
        Fill PIN
      </button>
      <button type="button" onClick={onSubmit}>
        Submit PIN
      </button>
    </>
  ),
}));
vi.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div>Language</div>,
}));
vi.mock("@/native", () => ({
  getBiometricAvailability: () => getBiometricAvailabilityMock(),
  verifyIdentity: vi.fn(),
}));

import MobileLogin from "./MobileLogin";

describe("MobileLogin launch routes", () => {
  beforeEach(() => {
    verifyAndSwitchOperatorMock.mockResolvedValue({ success: true });
  });

  it("lands on /m/queue after a successful mobile login", async () => {
    render(
      <MemoryRouter initialEntries={["/m/login"]}>
        <Routes>
          <Route path="/m/login" element={<MobileLogin />} />
          <Route path="/m/queue" element={<div>Mobile queue</div>} />
          <Route
            path="/operator/work-queue"
            element={<div>Desktop queue</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Employee badge"), {
      target: { value: "E-101" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Fill PIN" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit PIN" }));

    await waitFor(() => {
      expect(screen.getByText("Mobile queue")).toBeInTheDocument();
    });
  });

  it("returns operators to the requested touch-first route after badge + PIN", async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/m/login", state: { from: "/m/scan" } }]}
      >
        <Routes>
          <Route path="/m/login" element={<MobileLogin />} />
          <Route path="/m/scan" element={<div>Scan route</div>} />
          <Route path="/m/queue" element={<div>Mobile queue</div>} />
          <Route
            path="/operator/work-queue"
            element={<div>Desktop queue</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Employee badge"), {
      target: { value: "E-102" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Fill PIN" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit PIN" }));

    await waitFor(() => {
      expect(screen.getByText("Scan route")).toBeInTheDocument();
    });
  });
});
