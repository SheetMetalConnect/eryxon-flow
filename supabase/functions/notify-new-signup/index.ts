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
 *
 * Note: Edge functions run in Deno and don't have access to the React i18n system.
 * Labels are centralized below for easier maintenance. This is an internal admin
 * notification, not a user-facing email.
 */

import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCors } from "@shared/cors.ts";

/**
 * Centralized labels for email content.
 * These could be moved to a shared translations file if i18n is needed.
 */
const labels = {
  emailTitle: "New Signup",
  emailSubtitle: "A new company has signed up for Eryxon Flow",
  fieldCompany: "Company",
  fieldContactPerson: "Contact Person",
  fieldEmail: "Email",
  fieldPlan: "Plan",
  fieldStatus: "Status",
  fieldCreated: "Created",
  fieldTenantId: "Tenant ID",
  ctaButton: "View in Supabase",
  footerText: "This is an automated notification from Eryxon Flow.",
} as const;

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

    // Validate required tenant data - must have company_name or name
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

    // Validate plan and status exist (required fields from DB)
    if (!tenant.plan || !tenant.status) {
      console.error("Tenant missing plan or status:", {
        tenantId: tenant.id,
        plan: tenant.plan,
        status: tenant.status
      });
      return new Response(JSON.stringify({
        error: "Tenant missing plan or status",
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
    const escapedTenantId = escapeHtml(profile.tenant_id);
    const plan = escapeHtml(tenant.plan);
    const status = escapeHtml(tenant.status);

    // Extract project ref from Supabase URL for dashboard link
    // SUPABASE_URL format: https://{project-ref}.supabase.co
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const supabaseDashboardUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;

    // Format created_at only if it exists
    let createdAtFormatted: string | null = null;
    if (tenant.created_at) {
      createdAtFormatted = new Date(tenant.created_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    // Build email rows - only include fields with actual data (skip company, shown in header)
    const dataRows: string[] = [];

    if (contactName) {
      dataRows.push(`
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
          <span style="color: #64748b; font-size: 13px;">${labels.fieldContactPerson}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: right;">
          <span style="color: #f1f5f9; font-size: 14px; font-weight: 500;">${contactName}</span>
        </td>
      </tr>`);
    }

    dataRows.push(`
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
          <span style="color: #64748b; font-size: 13px;">${labels.fieldEmail}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: right;">
          <a href="mailto:${contactEmail}" style="color: #60a5fa; font-size: 14px; font-weight: 500; text-decoration: none;">${contactEmail}</a>
        </td>
      </tr>`);

    dataRows.push(`
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
          <span style="color: #64748b; font-size: 13px;">${labels.fieldPlan}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: right;">
          <span style="color: #f1f5f9; font-size: 14px; font-weight: 500;">${plan}</span>
        </td>
      </tr>`);

    dataRows.push(`
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
          <span style="color: #64748b; font-size: 13px;">${labels.fieldStatus}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: right;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: ${status === 'trial' ? 'rgba(251, 191, 36, 0.2)' : status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)'}; color: ${status === 'trial' ? '#fbbf24' : status === 'active' ? '#22c55e' : '#94a3b8'};">${status}</span>
        </td>
      </tr>`);

    if (createdAtFormatted) {
      dataRows.push(`
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
          <span style="color: #64748b; font-size: 13px;">${labels.fieldCreated}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: right;">
          <span style="color: #f1f5f9; font-size: 14px; font-weight: 500;">${createdAtFormatted}</span>
        </td>
      </tr>`);
    }

    dataRows.push(`
      <tr>
        <td style="padding: 12px 16px;">
          <span style="color: #64748b; font-size: 13px;">${labels.fieldTenantId}</span>
        </td>
        <td style="padding: 12px 16px; text-align: right;">
          <code style="color: #94a3b8; font-size: 12px; font-family: 'SF Mono', Monaco, monospace; background: rgba(100, 116, 139, 0.2); padding: 4px 8px; border-radius: 4px;">${escapedTenantId}</code>
        </td>
      </tr>`);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.emailTitle}: ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Logo/Brand Header -->
          <tr>
            <td style="padding: 0 0 24px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Eryxon</span>
              <span style="font-size: 24px; font-weight: 300; color: #3b82f6; letter-spacing: -0.5px;">Flow</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #334155;">

                <!-- Header with Icon -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #334155;">
                    <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; margin-bottom: 16px; line-height: 56px; font-size: 24px;">
                      🎉
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${labels.emailTitle}</h1>
                    <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">${labels.emailSubtitle}</p>
                  </td>
                </tr>

                <!-- Company Highlight -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2);">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${labels.fieldCompany}</p>
                          <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">${companyName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Details Grid -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${dataRows.join("")}
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${supabaseDashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                            ${labels.ctaButton} →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                ${labels.footerText}
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
        subject: `${labels.emailTitle}: ${companyName}`,
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
