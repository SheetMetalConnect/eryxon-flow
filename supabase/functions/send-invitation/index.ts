/**
 * Send Invitation Edge Function
 *
 * Creates an invitation record and sends an email to the invitee.
 * Uses Resend for email delivery.
 *
 * Required environment variables:
 * - RESEND_API_KEY: Your Resend API key
 * - APP_URL: Your application URL (e.g., https://app.eryxon.eu)
 * - EMAIL_FROM: Sender email address (e.g., noreply@eryxon.eu)
 */

import { createClient } from '@supabase/supabase-js'
import { corsHeaders, handleCors } from '@shared/cors.ts'

interface InvitationRequest {
  email: string
  role: 'operator' | 'admin'
  tenant_id?: string
}

interface ResendEmailPayload {
  from: string
  to: string
  subject: string
  html: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: InvitationRequest = await req.json()
    const { email, role = 'operator', tenant_id } = body

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role for user verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing SUPABASE_URL or service role key in environment')
      return new Response(
        JSON.stringify({ error: 'Server misconfigured. Missing Supabase credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token from the auth header
    const token = authHeader.replace('Bearer ', '')

    // Create admin client for user verification
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user's token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('User verification failed:', userError?.message || 'No user found')
      return new Response(
        JSON.stringify({
          error: 'Session expired. Please refresh the page and try again.',
          details: userError?.message
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get inviter's profile and tenant info using admin client (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Unable to get user profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Verify that the user is not trying to invite to a different tenant
    // This prevents cross-tenant invitation abuse even though we use service-role key
    // The tenant_id from the body must match the authenticated user's tenant_id from their profile
    if (tenant_id && tenant_id !== profile.tenant_id) {
      console.warn(`User ${user.id} attempted to invite to different tenant: ${tenant_id}`)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You can only invite users to your own organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tenant info separately
    const { data: tenantInfo } = await supabaseAdmin
      .from('tenants')
      .select('name, company_name')
      .eq('id', profile.tenant_id)
      .single()

    // Create client with user context for RLS operations (for invitation RPC)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Create invitation using RPC
    const { data: invitationId, error: invitationError } = await supabase.rpc('create_invitation', {
      p_email: email.toLowerCase(),
      p_role: role,
      p_tenant_id: tenant_id || profile.tenant_id
    })

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      return new Response(
        JSON.stringify({ error: invitationError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the invitation token
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('token')
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      console.error('Error fetching invitation:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch invitation details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables for email
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://eryxon-flow.lovable.app'
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Eryxon Flow <noreply@resend.dev>'

    // Build invitation URL
    const invitationUrl = `${appUrl}/accept-invitation/${invitation.token}`

    const organizationName = tenantInfo?.company_name || tenantInfo?.name || 'your organization'
    const inviterName = profile.full_name || user.email || 'A team member'
    const roleDisplay = role === 'admin' ? 'Administrator' : 'Operator'

    // If Resend API key is configured, send email
    if (resendApiKey) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">You're Invited!</h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">Join your team on Eryxon Flow</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Eryxon Flow as an <strong>${roleDisplay}</strong>.
              </p>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organization:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${organizationName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Role:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${roleDisplay}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Invited by:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${inviterName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>

              <!-- Link fallback -->
              <p style="margin: 24px 0 0 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; color: #64748b; font-size: 12px; line-height: 1.6; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${invitationUrl}" style="color: #3b82f6;">${invitationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                Eryxon Flow - Manufacturing Execution System
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">
                This email was sent to ${email}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

      const emailPayload: ResendEmailPayload = {
        from: emailFrom,
        to: email,
        subject: `You're invited to join ${organizationName} on Eryxon Flow`,
        html: emailHtml
      }

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        })

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text()
          console.error('Resend API error:', errorData)
          // Don't fail the request, invitation was created
          return new Response(
            JSON.stringify({
              success: true,
              invitation_id: invitationId,
              email_sent: false,
              email_error: 'Failed to send email, but invitation was created',
              invitation_url: invitationUrl
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const resendData = await resendResponse.json()
        console.log('Email sent successfully:', resendData)

        return new Response(
          JSON.stringify({
            success: true,
            invitation_id: invitationId,
            email_sent: true,
            email_id: resendData.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't fail the request, invitation was created
        return new Response(
          JSON.stringify({
            success: true,
            invitation_id: invitationId,
            email_sent: false,
            email_error: 'Failed to send email, but invitation was created',
            invitation_url: invitationUrl
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // No email service configured - return the invitation URL for manual sharing
      console.log('No RESEND_API_KEY configured, returning invitation URL')
      return new Response(
        JSON.stringify({
          success: true,
          invitation_id: invitationId,
          email_sent: false,
          message: 'Email service not configured. Share the invitation link manually.',
          invitation_url: invitationUrl
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
