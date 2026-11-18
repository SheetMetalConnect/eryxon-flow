import { describe, expect, it } from "vitest";
import { coverage } from "./coverage.js";
import { allTools } from "./tools/index.js";

describe("UI/REST parity", () => {
  const names = new Set(allTools.map((t) => t.name));
  it("every capability maps to registered tools", () => {
    for (const [capability, tools] of Object.entries(coverage)) {
      expect(tools.length, capability).toBeGreaterThan(0);
      for (const name of tools) expect(names.has(name), `${capability} → ${name}`).toBe(true);
    }
  });
  it("every tool is claimed by a capability", () => {
    const claimed = new Set(Object.values(coverage).flat());
    expect([...names].filter((n) => !claimed.has(n))).toEqual([]);
  });
});
