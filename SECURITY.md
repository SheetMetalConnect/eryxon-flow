# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

We recommend always using the latest version for security updates.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email us at:

**security@sheetmetalconnect.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### What to Expect

1. **Acknowledgment**: We'll acknowledge your report within 48 hours
2. **Assessment**: We'll assess the severity within 1 week
3. **Fix Timeline**: Critical issues fixed within 2 weeks
4. **Disclosure**: We'll coordinate public disclosure with you

### Scope

The following are in scope:
- Eryxon Flow web application
- Supabase Edge Functions
- MCP Server implementation
- API endpoints

Out of scope:
- Third-party services (Supabase, Cloudflare)
- Social engineering attacks
- Physical security

## Security Architecture

### Authentication

- Supabase Auth handles user authentication
- JWT tokens with configurable expiration
- Row-Level Security (RLS) enforces tenant isolation

### Multi-Tenancy

- All data is tenant-scoped via `tenant_id`
- RLS policies prevent cross-tenant data access
- API keys are scoped to specific tenants

### API Security

- API keys use `ery_live_` / `ery_test_` prefixes
- Keys are hashed before storage (SHA-256)
- Rate limiting via Cloudflare

### Data Protection

- All data encrypted at rest (Supabase)
- TLS encryption in transit
- No sensitive data in client-side storage

## Self-Hosting Security

If you self-host Eryxon Flow:

### Required

- [ ] Use HTTPS with valid certificates
- [ ] Set strong database passwords
- [ ] Enable Supabase RLS policies
- [ ] Keep dependencies updated

### Recommended

- [ ] Regular database backups
- [ ] Monitor access logs
- [ ] Use a Web Application Firewall (WAF)
- [ ] Implement IP allowlisting for admin access

### Environment Variables

Never commit secrets to version control:

```bash
# .env should contain:
VITE_SUPABASE_URL=...          # Safe to expose (public)
VITE_SUPABASE_PUBLISHABLE_KEY=...  # Safe to expose (anon key)

# Keep these secret:
SUPABASE_SERVICE_KEY=...       # Never expose
DATABASE_URL=...               # Never expose
```

## Known Security Considerations

### BSL License Implications

The Business Source License allows self-hosting but prohibits competing hosted services. This is a business restriction, not a security concern.

### Manufacturing Data

Eryxon Flow may handle sensitive manufacturing data:
- Production schedules
- Customer information
- Part specifications

Ensure your deployment meets your organization's data protection requirements.

## Security Updates

- Watch [GitHub Releases](https://github.com/SheetMetalConnect/eryxon-flow/releases)
- Subscribe to security advisories (coming soon)
- Check `npm audit` regularly for dependency vulnerabilities

## Recognition

We appreciate responsible disclosure. Contributors who report valid security issues will be acknowledged (with permission) in release notes.

---

*Last updated: January 2025*
