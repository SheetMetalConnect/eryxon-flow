import { readFileSync } from 'node:fs';
import { ModuleKind, transpileModule } from 'typescript';
import type { SupabaseClient } from '@supabase/supabase-js';

type Context = { supabase: SupabaseClient; tenantId: string; url: URL; recordPilotEvent: () => Promise<void> };
type Handler = (request: Request, context: Context) => Promise<Response>;

// Execute the real entrypoint while substituting only its Deno server boundary.
export function loadEntrypoint(name: string, imports: Record<string, unknown> = {}): Handler {
  let handler: Handler | undefined;
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  const { outputText } = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } });
  const modules: Record<string, unknown> = {
    '@shared/handler.ts': {
      serveApi: (callback: Handler) => { handler = callback; },
      successResponse: (data: unknown, status = 200) => Response.json({ success: true, data }, { status }),
      errorResponse: (code: string, message: string, status = 400) => Response.json({ error: { code, message } }, { status }),
    },
    ...imports,
  };
  new Function('require', 'exports', outputText)((id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected test import: ${id}`);
    return modules[id];
  }, {});
  if (!handler) throw new Error('Entrypoint did not register a handler');
  return handler;
}
