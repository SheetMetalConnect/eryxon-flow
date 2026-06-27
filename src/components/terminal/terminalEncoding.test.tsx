import { describe, expect, it } from "vitest";
import { getTerminalOperationType } from "./terminalEncoding";

const baseJob = {
  status: "in_buffer" as const,
  currentOp: "",
  operationType: null,
  batchContext: null,
  cellName: "",
};

describe("terminal encoding", () => {
  it("classifies Afwerking/finishing cells as finishing instead of defaulting to assembly", () => {
    const type = getTerminalOperationType({
      ...baseJob,
      currentOp: "Afwerking",
      cellName: "Afwerking",
    });

    expect(type.key).toBe("finishing");
    expect(type.label.key).toBe("terminal.encoding.type.finishing");
  });

  it("does not label unknown operations as assembly", () => {
    const type = getTerminalOperationType({
      ...baseJob,
      currentOp: "Custom customer step",
      cellName: "Custom cell",
    });

    expect(type.key).toBe("operation");
    expect(type.label.key).toBe("terminal.encoding.type.operation");
  });
});
