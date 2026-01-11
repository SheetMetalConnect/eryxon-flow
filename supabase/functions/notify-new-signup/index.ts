/**
 * Edge function to notify admin of new signups
 * Triggered via database webhook when a new tenant is created.
 *
 * Required secrets (Settings > Edge Functions > Secrets):
 * - RESEND_API_KEY: Your Resend API key
 * - ADMIN_NOTIFICATION_EMAIL: Email to receive notifications
 * - APP_URL: (optional) Your app URL
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  const APP_URL = Deno.env.get("APP_URL") || "https://app.eryxon.eu";

  try {
    // Validate secrets
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ADMIN_EMAIL) {
      console.error("ADMIN_NOTIFICATION_EMAIL not configured");
      return new Response(
        JSON.stringify({ error: "ADMIN_NOTIFICATION_EMAIL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload));

    // Extract tenant data - handle different payload formats
    let tenant = null;

    // Format 1: Direct record (from trigger)
    if (payload.record) {
      tenant = payload.record;
    }
    // Format 2: Wrapped in type/table structure
    else if (payload.type === "INSERT" && payload.table === "tenants") {
      tenant = payload.record;
    }
    // Format 3: The payload IS the tenant
    else if (payload.id && payload.name) {
      tenant = payload;
    }

    if (!tenant || !tenant.id) {
      console.log("No valid tenant data found in payload");
      return new Response(
        JSON.stringify({ message: "No tenant data", payload }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing tenant:", tenant.id, tenant.name || tenant.company_name);

    // Build email
    const companyName = tenant.company_name || tenant.name || "Unknown Company";
    const createdAt = tenant.created_at
      ? new Date(tenant.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .info-row { margin: 12px 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 600; color: #111827; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🚀 New Signup Request</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">A new company has requested access to Eryxon Flow</p>
    </div>
    <div class="content">
      <div class="info-row">
        <div class="label">Company</div>
        <div class="value">${escapeHtml(companyName)}</div>
      </div>
      <div class="info-row">
        <div class="label">Plan</div>
        <div class="value">${tenant.plan || "trial"} (${tenant.status || "pending"})</div>
      </div>
      <div class="info-row">
        <div class="label">Created</div>
        <div class="value">${createdAt}</div>
      </div>
      <div class="info-row">
        <div class="label">Tenant ID</div>
        <div class="value" style="font-family: monospace; font-size: 12px;">${tenant.id}</div>
      </div>
      <a href="${APP_URL}/admin/users" class="button">Review in Admin Panel</a>
      <div class="footer">
        <p>This is an automated notification from Eryxon Flow.</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

    // Send via Resend
    console.log("Sending email to:", ADMIN_EMAIL);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Eryxon Flow <noreply@eryxon.eu>",
        to: [ADMIN_EMAIL],
        subject: `🚀 New Signup: ${companyName}`,
        html: emailHtml,
      }),
    });

    const responseText = await emailResponse.text();
    console.log("Resend response:", emailResponse.status, responseText);

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Resend failed", status: emailResponse.status, details: responseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(responseText);
    console.log("Email sent successfully:", result.id);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
