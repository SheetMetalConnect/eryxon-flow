import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WEBHOOK_EVENTS } from "./schemas.js";

describe("webhook event catalogue", () => {
  it("matches src/lib/webhookEvents.ts in the app", () => {
    const source = readFileSync(new URL("../../src/lib/webhookEvents.ts", import.meta.url), "utf8");
    const app = [...source.matchAll(/"([a-z]+\.[a-z.]+)"/g)].map((m) => m[1]);
    expect([...WEBHOOK_EVENTS]).toEqual(app);
  });
});
