import { serveApi, errorResponse, successResponse } from "@shared/handler.ts";

const encodeHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

// Admin-facing API key management (JWT of a signed-in admin, not an API key).
// POST creates a key and returns the plaintext once; GET lists; DELETE revokes.
serveApi(async (req, { supabase, url }) => {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  const { data: profile } = user
    ? await supabase.from("profiles").select("id, tenant_id, role").eq("id", user.id).single()
    : { data: null };
  if (!profile || profile.role !== "admin") return errorResponse("UNAUTHORIZED", "Admin authentication required", 401);

  if (req.method === "GET") {
    const { data, error } = await supabase.from("api_keys")
      .select("id, name, key_prefix, active, last_used_at, created_at, created_by:profiles(id, username, full_name)")
      .eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false });
    if (error) throw error;
    return successResponse({ api_keys: data });
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("VALIDATION_ERROR", "API key ID is required (?id=xxx)");
    const { data, error } = await supabase.from("api_keys").update({ active: false })
      .eq("id", id).eq("tenant_id", profile.tenant_id).select("id");
    if (error) throw error;
    if (data.length === 0) return errorResponse("NOT_FOUND", "API key not found", 404);
    return successResponse({ id, revoked: true });
  }

  const name = String((await req.json()).name ?? "").trim();
  if (!name) return errorResponse("VALIDATION_ERROR", "Name is required");
  const apiKey = `ery_live_${encodeHex(crypto.getRandomValues(new Uint8Array(16)))}`;
  const keyHash = encodeHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey))));
  const { data, error } = await supabase.from("api_keys")
    .insert({ tenant_id: profile.tenant_id, name, key_hash: keyHash, key_prefix: apiKey.slice(0, 12), created_by: profile.id, active: true })
    .select("id, name, key_prefix, created_at").single();
  if (error) throw error;
  return successResponse({ ...data, api_key: apiKey }, 201);
}, { public: true, methods: ["GET", "POST", "DELETE", "OPTIONS"] });
