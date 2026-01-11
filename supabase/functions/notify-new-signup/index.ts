/**
 * Edge function to notify admin of new signups and add to Resend audience
 * Triggered via database webhook when a new tenant is created.
 *
 * Required secrets (Settings > Edge Functions > Secrets):
 * - RESEND_API_KEY: Your Resend API key
 * - ADMIN_NOTIFICATION_EMAIL: Email to receive notifications
 * - RESEND_AUDIENCE_ID: (optional) Resend audience ID for onboarding emails
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
  const RESEND_AUDIENCE_ID = Deno.env.get("RESEND_AUDIENCE_ID");
  const APP_URL = Deno.env.get("APP_URL") || "https://app.eryxon.eu";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    // Get the admin user for this tenant
    let userEmail = "";
    let userFirstName = "";
    let userLastName = "";

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?tenant_id=eq.${tenant.id}&role=eq.admin&limit=1`,
          {
            headers: {
              "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
              "apikey": SUPABASE_SERVICE_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        if (profileResponse.ok) {
          const profiles = await profileResponse.json();
          if (profiles.length > 0) {
            userEmail = profiles[0].email || "";
            const fullName = profiles[0].full_name || "";
            const nameParts = fullName.split(" ");
            userFirstName = nameParts[0] || "";
            userLastName = nameParts.slice(1).join(" ") || "";
            console.log("Found user:", userEmail, fullName);
          }
        }
      } catch (e) {
        console.error("Error fetching profile:", e.message);
      }
    }

    // Build admin notification email
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
        <div class="label">Contact</div>
        <div class="value">${escapeHtml(userFirstName + " " + userLastName)} (${escapeHtml(userEmail)})</div>
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
      <a href="${APP_URL}/admin/dashboard" class="button">Review in Admin Panel</a>
      <div class="footer">
        <p>This is an automated notification from Eryxon Flow.</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

    // Send admin notification email
    console.log("Sending admin notification to:", ADMIN_EMAIL);

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

    const emailResponseText = await emailResponse.text();
    console.log("Admin email response:", emailResponse.status, emailResponseText);

    // Add user to Resend audience for onboarding emails
    let contactResult = null;
    if (RESEND_AUDIENCE_ID && userEmail) {
      console.log("Adding contact to Resend audience:", userEmail);

      try {
        const contactResponse = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userEmail,
            first_name: userFirstName,
            last_name: userLastName,
            unsubscribed: false,
          }),
        });

        const contactResponseText = await contactResponse.text();
        console.log("Resend contact response:", contactResponse.status, contactResponseText);

        if (contactResponse.ok) {
          contactResult = JSON.parse(contactResponseText);
          console.log("Contact added successfully:", contactResult.id);
        } else {
          console.error("Failed to add contact:", contactResponseText);
        }
      } catch (e) {
        console.error("Error adding contact to audience:", e.message);
      }
    } else if (!RESEND_AUDIENCE_ID) {
      console.log("RESEND_AUDIENCE_ID not configured, skipping audience");
    } else if (!userEmail) {
      console.log("No user email found, skipping audience");
    }

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Admin email failed", status: emailResponse.status, details: emailResponseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResult = JSON.parse(emailResponseText);
    console.log("Notification complete - Email:", emailResult.id, "Contact:", contactResult?.id);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        contactId: contactResult?.id || null,
        addedToAudience: !!contactResult
      }),
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
