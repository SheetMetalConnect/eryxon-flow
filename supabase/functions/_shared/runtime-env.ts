export function getRuntimeEnv(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env: { get(key: string): string | undefined } };
  };
  return runtime.Deno?.env.get(name);
}
