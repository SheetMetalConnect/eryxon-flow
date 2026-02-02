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

    // Fetch tenant details
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, company_name, plan, status, created_at")
      .eq("id", profile.tenant_id)
      .single();

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

    const companyName = tenant?.company_name || tenant?.name || "Unknown";
    const planDisplay = `${tenant?.plan || "free"} (${tenant?.status || "trial"})`;
    const createdAt = tenant?.created_at
      ? new Date(tenant.created_at).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Unknown";
    const adminPanelUrl = `${appUrl}/admin/config/users`;

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
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Company</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${companyName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Contact Person</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${profile.full_name || "Not provided"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${profile.email || "Not provided"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${planDisplay}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Created</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${createdAt}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Tenant ID</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${profile.tenant_id}</td>
                      </tr>
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
