import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readConnectorEntrypoint(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("connector edge runtime entrypoints", () => {
  it.each([
    "supabase/functions/webhook-dispatch/index.ts",
    "supabase/functions/mqtt-publish/index.ts",
  ])("%s uses Deno.serve instead of the deprecated stdlib http server", (filePath) => {
    const source = readConnectorEntrypoint(filePath);

    expect(source).toContain("Deno.serve(");
    expect(source).not.toContain('from "https://deno.land/std@0.168.0/http/server.ts"');
  });
});
