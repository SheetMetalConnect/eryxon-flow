# Troubleshooting — Common Agent Pitfalls

> Known issues that trip up AI agents. Read this before modifying Edge Functions or database queries.

## Edge Functions

### Hallucinated column names (502 errors)
**Symptom:** Edge function deploys fine but returns 502 on every request.
**Cause:** Agent invented a column name that doesn't exist in the database.
**Fix:** Always verify column names against `docs/DATABASE_DIAGRAM.dbml` or run:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'your_table';
```

### `import { serve }` instead of `Deno.serve()`
**Symptom:** Function crashes on deploy or returns empty response.
**Cause:** Using deprecated `import { serve } from "https://deno.land/std/..."`.
**Fix:** Always use `Deno.serve()` directly. The `serveApi()` wrapper handles this.

### `export default serveApi(...)`
**Symptom:** TypeScript error or runtime crash.
**Cause:** `serveApi()` returns void, can't be default-exported.
**Fix:** Just call `serveApi(handler)` at module level — no export.

### Missing `deno.json` in new function
**Symptom:** `Cannot find module "@shared/..."` error.
**Fix:** Every function directory needs its own `deno.json`:
```json
{ "imports": { "@shared/": "../_shared/" } }
```

### FK hint missing (ambiguous join)
**Symptom:** `Could not find a relationship between X and Y` or wrong data returned.
**Cause:** Table has multiple foreign keys to the same target table.
**Fix:** Use PostgREST FK hints in selectFields: `column_name!fk_constraint_name(fields)`.

## Database

### RLS blocks all data
**Symptom:** Query returns empty array even though data exists.
**Cause:** `set_active_tenant()` wasn't called, or tenant_id doesn't match.
**Fix:** Ensure `authenticateAndSetContext()` is called before any query. Check that the API key belongs to the correct tenant.

### Soft-deleted records appearing
**Symptom:** Deleted records show up in list endpoints.
**Cause:** Query missing `deleted_at IS NULL` filter.
**Fix:** Use crud-builder (handles this automatically) or add `.is('deleted_at', null)` to query.

### Migration naming
**Symptom:** Migration not applied or applied in wrong order.
**Fix:** Always use timestamp prefix: `YYYYMMDDHHMMSS_description.sql`. Never rename existing migrations.

## Frontend

### `@/` import not resolving
**Symptom:** Module not found errors in IDE or build.
**Fix:** Ensure `tsconfig.app.json` has the path alias and the file path is correct relative to `src/`.

### TanStack Query cache stale
**Symptom:** UI shows old data after mutation.
**Fix:** Invalidate the correct query key after mutation. Check `docs/HOOK_MAP.md` for the right key pattern.

### i18n key showing raw key text
**Symptom:** UI shows `jobs.status.in_progress` instead of translated text.
**Fix:** Add the key to all three language files: `src/i18n/en/`, `nl/`, `de/`.

### shadcn/ui component missing
**Symptom:** Import error for a UI component.
**Fix:** Component may not be installed yet:
```bash
npx shadcn-ui@latest add <component-name>
```

## Build

### Chunk size warnings
**Symptom:** Build warns about chunks > 500KB.
**Context:** This is expected for `vendor-three` (Three.js) and `index` (main bundle). The chunks are already manually split in `vite.config.ts`. Only investigate if a NEW chunk exceeds 500KB.

### Type generation out of sync
**Symptom:** TypeScript errors on Supabase table types.
**Fix:** Regenerate types:
```bash
supabase gen types typescript --project-id <ref> > src/integrations/supabase/types/database.ts
```
wh
