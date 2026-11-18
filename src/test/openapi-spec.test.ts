import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface OpenApiDocument {
  info: { version: string };
  servers: Array<{ url: string }>;
  paths: Record<string, unknown>;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const spec = JSON.parse(
  readFileSync(resolve(repositoryRoot, "public/openapi.json"), "utf8"),
) as OpenApiDocument;
const packageVersion = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
).version as string;

describe("public OpenAPI contract", () => {
  it("tracks the application version and uses a deployment-neutral server", () => {
    expect(spec.info.version).toBe(packageVersion);
    expect(spec.servers[0]?.url).toBe("{functionsUrl}");
    expect(JSON.stringify(spec)).not.toContain("vatgianzotsurljznsry");
  });

  it("only references Edge Functions that exist in the repository", () => {
    for (const path of Object.keys(spec.paths)) {
      const functionName = path.split("/").filter(Boolean)[0];
      expect(functionName, path).toBeTruthy();
      expect(
        existsSync(
          resolve(repositoryRoot, "supabase/functions", functionName!, "index.ts"),
        ),
        path,
      ).toBe(true);
    }
  });

  it("does not advertise retired task, stage or billing surfaces", () => {
    const serialized = JSON.stringify(spec);
    for (const retired of [
      "api-tasks",
      "api-stages",
      "api-job-lifecycle",
      "api-webhook-logs",
      "stripe-create-checkout",
      "Premium",
    ]) {
      expect(serialized).not.toContain(retired);
    }
  });
});
