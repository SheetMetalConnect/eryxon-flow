/**
 * Edge function to notify admin of new signups
 *
 * This function is triggered via database webhook when a new tenant is created.
 * It sends an email notification to the configured admin email via Resend.
 *
 * Required secrets (set via Supabase Dashboard > Settings > Edge Functions > Secrets):
 * - RESEND_API_KEY: Your Resend API key
 * - ADMIN_NOTIFICATION_EMAIL: Email address to receive notifications
 *
 * Optional secrets:
 * - APP_URL: Base URL of the application (for approval link)
 */

import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
const APP_URL = Deno.env.get("APP_URL") || "https://app.eryxon.eu";

interface TenantPayload {
  type: "INSERT";
  table: "tenants";
  schema: "public";
  record: {
    id: string;
    name: string;
    company_name: string | null;
    plan: string;
    status: string;
    created_at: string;
  };
  old_record: null;
}

interface ProfileInfo {
  id: string;
  full_name: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate required secrets
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ADMIN_EMAIL) {
      console.error("ADMIN_NOTIFICATION_EMAIL not configured");
      return new Response(
        JSON.stringify({ error: "Admin email not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the webhook payload
    const payload: TenantPayload = await req.json();

    // Only process INSERT events on tenants table
    if (payload.type !== "INSERT" || payload.table !== "tenants") {
      return new Response(
        JSON.stringify({ message: "Ignored - not a tenant insert" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenant = payload.record;

    // Get the admin user who created this tenant (first profile with this tenant_id)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let userInfo: ProfileInfo | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?tenant_id=eq.${tenant.id}&role=eq.admin&limit=1`,
        {
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (profileResponse.ok) {
        const profiles = await profileResponse.json();
        if (profiles.length > 0) {
          userInfo = profiles[0];
        }
      }
    }

    // Build the email content
    const companyName = tenant.company_name || tenant.name || "Unknown Company";
    const userEmail = userInfo?.email || "Unknown";
    const userName = userInfo?.full_name || "Unknown User";
    const createdAt = new Date(tenant.created_at).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

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
        <div class="label">Contact Name</div>
        <div class="value">${escapeHtml(userName)}</div>
      </div>
      <div class="info-row">
        <div class="label">Email</div>
        <div class="value">${escapeHtml(userEmail)}</div>
      </div>
      <div class="info-row">
        <div class="label">Requested Plan</div>
        <div class="value">${tenant.plan} (${tenant.status})</div>
      </div>
      <div class="info-row">
        <div class="label">Signed Up</div>
        <div class="value">${createdAt}</div>
      </div>
      <div class="info-row">
        <div class="label">Tenant ID</div>
        <div class="value" style="font-family: monospace; font-size: 12px;">${tenant.id}</div>
      </div>

      <a href="${APP_URL}/admin/users" class="button">Review in Admin Panel</a>

      <div class="footer">
        <p>This is an automated notification from Eryxon Flow.</p>
        <p>To approve this signup, log in to the admin panel and change the tenant status to "active".</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email via Resend
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

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send notification email", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResult = await emailResponse.json();
    console.log("Notification email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-new-signup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
