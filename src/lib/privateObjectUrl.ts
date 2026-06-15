/**
 * Private storage bucket identifiers used by the app.
 *
 * `cadProxy.ts` imports `PrivateStorageBucket` from here. The module was
 * referenced but never added (ERY-305); this defines the canonical type so the
 * import resolves. Mirrors the edge-side type in
 * supabase/functions/_shared/private-storage.ts.
 */

export type PrivateStorageBucket = "parts-cad" | "parts-images";
