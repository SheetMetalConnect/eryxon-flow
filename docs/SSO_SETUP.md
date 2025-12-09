# SSO & OAuth Setup Guide

This document provides detailed instructions for configuring OAuth and SSO authentication in Eryxon MES.

---

## Overview

Eryxon MES supports two levels of authentication:

| Feature | Availability | Description |
|---------|--------------|-------------|
| **Social OAuth** | All Plans | Microsoft & Google login buttons for signup/signin |
| **Enterprise SSO** | Premium/Enterprise | Domain enforcement, SAML, custom IdP configuration |

---

## Part 1: Social OAuth Setup (All Users)

### Microsoft OAuth Configuration

#### Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `Eryxon MES`
   - **Supported account types**: Choose based on your needs:
     - *Single tenant*: Only your organization
     - *Multitenant*: Any Azure AD organization
     - *Multitenant + personal*: Any org + personal Microsoft accounts
   - **Redirect URI**:
     - Type: `Web`
     - URI: `https://<your-project>.supabase.co/auth/v1/callback`

5. Click **Register**

#### Step 2: Configure App Credentials

1. In your new App Registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and expiry (recommend 24 months)
4. **Copy the secret value immediately** (shown only once)

#### Step 3: Note Required Values

From the **Overview** page, copy:
- **Application (client) ID**
- **Directory (tenant) ID** (if single tenant)

#### Step 4: Configure in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers** → **Microsoft**
4. Enable Microsoft provider
5. Enter:
   - **Client ID**: Application (client) ID from Azure
   - **Client Secret**: The secret value you copied
   - **Tenant ID** (optional): Leave empty for multitenant

### Google OAuth Configuration

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure consent screen:
   - **User Type**: External (or Internal for Workspace)
   - Fill in required fields
   - Add scopes: `email`, `profile`, `openid`

#### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure:
   - **Application type**: Web application
   - **Name**: `Eryxon MES`
   - **Authorized redirect URIs**: `https://<your-project>.supabase.co/auth/v1/callback`
4. Click **Create**
5. Copy **Client ID** and **Client Secret**

#### Step 3: Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Enter Client ID and Client Secret

---

## Part 2: Enterprise SSO (Premium/Enterprise Only)

Enterprise SSO provides advanced authentication controls for organizations.

### Features

| Feature | Description |
|---------|-------------|
| **Domain-based routing** | Auto-detect organization by email domain |
| **Enforce SSO only** | Disable password login for entire organization |
| **SAML support** | Connect enterprise IdPs (Okta, OneLogin, etc.) |

### Configuration

Enterprise SSO is configured in **Organization Settings** → **Single Sign-On** for Premium/Enterprise tenants.

#### Domain-Based Routing

1. Navigate to **Organization Settings** → **Single Sign-On**
2. Enable SSO
3. Select provider (Microsoft, Google, or SAML)
4. Enter your organization's email domain (e.g., `acme.com`)
5. When users with `@acme.com` emails attempt to login, they'll be automatically directed to SSO

#### Enforce SSO Only

When enabled:
- Password login is completely disabled for your organization
- All users MUST authenticate via configured SSO provider
- Useful for security compliance requirements

### SAML Configuration (Supabase Pro Required)

For SAML SSO with custom identity providers, Supabase Pro plan is required.

1. Contact Supabase support to enable SAML for your project
2. Configure your IdP with Supabase's SAML metadata
3. In Organization Settings, select SAML as provider
4. Enter IdP metadata URL or upload metadata XML

---

## Database Schema

SSO configuration is stored in the `tenants` table:

```sql
-- SSO columns (premium feature)
sso_enabled       BOOLEAN DEFAULT false  -- SSO feature toggle
sso_provider      TEXT                   -- 'microsoft', 'google', 'saml'
sso_domain        TEXT                   -- Email domain for routing
sso_enforce_only  BOOLEAN DEFAULT false  -- Disable password login
```

### Database Functions

```sql
-- Check if tenant can use SSO (premium check)
can_use_sso(p_tenant_id UUID) → BOOLEAN

-- Get current tenant's SSO configuration
get_tenant_sso_config() → TABLE

-- Check if email domain matches any SSO tenant
check_sso_domain(p_email TEXT) → TABLE
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | OAuth sign-in methods |
| `src/pages/auth/Auth.tsx` | Login page with OAuth buttons |
| `src/pages/auth/AuthCallback.tsx` | OAuth callback handler |
| `src/hooks/useCanUseSSO.ts` | Premium SSO feature check |
| `src/components/admin/SSOSettings.tsx` | SSO configuration UI |
| `supabase/migrations/20251209100000_add_sso_support.sql` | Database schema |

---

## Troubleshooting

### "Invalid redirect URI" Error
- Ensure the redirect URI in Azure/Google matches exactly: `https://<project>.supabase.co/auth/v1/callback`
- Check for trailing slashes

### "Access denied" After OAuth
- User email might not be verified
- Check Supabase auth logs for details
- Verify the user exists in profiles table

### SSO Button Not Appearing
- Check that OAuth provider is enabled in Supabase Dashboard
- Verify environment has correct Supabase URL

### Enterprise SSO Not Working
- Verify tenant is on Premium or Enterprise plan
- Check that `sso_enabled` is true in database
- Confirm email domain matches configured `sso_domain`

---

## Security Considerations

1. **Never expose client secrets** in frontend code
2. **Use HTTPS only** for redirect URIs
3. **Rotate secrets** periodically (every 12-24 months)
4. **Monitor auth logs** for suspicious activity
5. **Enable MFA** at the IdP level for extra security

---

## Cost

| Component | Cost |
|-----------|------|
| Microsoft OAuth | Free |
| Google OAuth | Free |
| Supabase Auth (OAuth) | Free tier included |
| Supabase SAML | Requires Supabase Pro ($25/mo) |

---

*Last updated: December 2024*
