/**
 * Notify New Signup Edge Function
 *
 * Called by a database webhook trigger when a new admin profile is created
 * (indicating a new company signup). Sends a notification email to the
 * configured admin email with full user details.
 *
 * Required environment variables:
 * - RESEND_API_KEY: Your Resend API key
 * - SIGNUP_NOTIFY_EMAIL: Email address to receive signup notifications
 * - APP_URL: Your application URL (e.g., https://app.eryxon.eu)
 * - EMAIL_FROM: Sender email address
 */

import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCors } from "@shared/cors.ts";

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    tenant_id: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  };
  schema: string;
}

/**
 * Escape HTML special characters to prevent XSS in email content
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const payload: WebhookPayload = await req.json();
    const profile = payload.record;

    // Only process new admin signups (not invitations/operators)
    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ message: "Skipped: not an admin signup" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required profile data
    if (!profile.email || !profile.tenant_id) {
      console.error("Missing required profile data:", {
        hasEmail: !!profile.email,
        hasTenantId: !!profile.tenant_id,
        profileId: profile.id
      });
      return new Response(JSON.stringify({ error: "Missing required profile data (email or tenant_id)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant details
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, company_name, plan, status, created_at")
      .eq("id", profile.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("Failed to fetch tenant:", {
        tenantId: profile.tenant_id,
        error: tenantError?.message || "Tenant not found",
        code: tenantError?.code,
      });
      return new Response(JSON.stringify({
        error: "Failed to fetch tenant data",
        tenantId: profile.tenant_id,
        details: tenantError?.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is the first admin with email login in the tenant (true new signup)
    // Skip if there are other admin email-login users (invited admin joining existing tenant)
    const { count: existingAdminCount, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "admin")
      .eq("has_email_login", true);

    if (countError) {
      console.error("Failed to count existing admins:", countError);
      // Continue anyway - better to send duplicate than miss a signup
    } else if (existingAdminCount && existingAdminCount > 1) {
      // More than 1 admin with email login means this is an invited admin, not a new signup
      return new Response(JSON.stringify({ message: "Skipped: not the first admin in tenant" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required tenant data
    if (!tenant.company_name && !tenant.name) {
      console.error("Tenant missing company name:", { tenantId: tenant.id });
      return new Response(JSON.stringify({
        error: "Tenant missing company name",
        tenantId: tenant.id
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notifyEmail = Deno.env.get("SIGNUP_NOTIFY_EMAIL");
    const appUrl = Deno.env.get("APP_URL") || "https://app.eryxon.eu";
    const emailFrom = Deno.env.get("EMAIL_FROM") || "Eryxon Flow <noreply@resend.dev>";

    if (!resendApiKey || !notifyEmail) {
      console.log("RESEND_API_KEY or SIGNUP_NOTIFY_EMAIL not configured, skipping notification");
      return new Response(JSON.stringify({ message: "Email not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Escape all user-controlled values for safe HTML injection
    const companyName = escapeHtml(tenant.company_name || tenant.name);
    const contactName = profile.full_name ? escapeHtml(profile.full_name) : null;
    const contactEmail = escapeHtml(profile.email);
    const tenantId = escapeHtml(profile.tenant_id);
    const plan = escapeHtml(tenant.plan || "free");
    const status = escapeHtml(tenant.status || "trial");
    const createdAt = tenant.created_at
      ? new Date(tenant.created_at).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
    const adminPanelUrl = `${appUrl}/admin/config/users`;

    // Build email rows - only include fields with actual data
    const dataRows: string[] = [];

    dataRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Company</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${companyName}</td>
      </tr>`);

    if (contactName) {
      dataRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Contact Person</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${contactName}</td>
      </tr>`);
    }

    dataRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${contactEmail}</td>
      </tr>`);

    dataRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${plan} (${status})</td>
      </tr>`);

    if (createdAt) {
      dataRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Created</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${createdAt}</td>
      </tr>`);
    }

    dataRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Tenant ID</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${tenantId}</td>
      </tr>`);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Signup: ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">New Signup</h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">A new company has signed up for Eryxon Flow</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${dataRows.join("")}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px 0 0 0;">
                    <a href="${adminPanelUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      Review in Admin Panel
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated notification from Eryxon Flow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: notifyEmail,
        subject: `New Signup: ${companyName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await emailResponse.json();
    console.log("Signup notification sent successfully:", result);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in notify-new-signup:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
