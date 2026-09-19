---
title: "Connectivity Overview"
description: "Integration architecture, authentication, and real-time connectivity options."
---



Eryxon Flow provides multiple connectivity options for integrating with external systems, industrial automation, and AI agents.

## Integration Architecture

Eryxon Flow keeps inbound commands and outbound events separate.

- **Inbound**: [REST API](/api/rest-api-reference/), Real-time WebSockets, [MCP (AI agents)](/guides/mcp-setup/).
- **Outbound**: [Webhooks](/api/rest-api-reference/#webhook-events) (signed HTTP POST). A UNS or MQTT bridge subscribes to the webhooks; the app does not publish to brokers itself.
- **Bidirectional**: ERP Sync, [Model Context Protocol (MCP)](/guides/mcp-setup/).

---

## Authentication

### API Key Authentication
All external API calls currently require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer ery_live_xxxxxxxxxxxxxxxxxxxx
```
- `ery_live_`: Production keys.
- `ery_test_`: Sandbox/testing keys.
- Keys are hashed with SHA-256 and validated in edge functions with constant-time comparison.

For the detailed API contract, see [REST API Reference](/api/rest-api-reference/).

### MCP Authentication
The MCP server runs with the Supabase service-role key on trusted infrastructure, pinned to one workshop with `TENANT_ID`. Its HTTP transport is protected with a bearer token (`MCP_BEARER`). See the [MCP Server Setup Guide](/guides/mcp-setup/).

---

## Real-time Subscriptions (Inbound)

Eryxon uses Supabase Realtime (WebSockets) to push updates to the frontend and connected clients instantly.

### Hooks for Developers
The current app standardizes realtime subscription behavior around shared subscription utilities and tenant-aware hooks used by operator, issue, notification, and dashboard flows.

The important behavior is:

- subscriptions are tenant-scoped
- cleanup is explicit on unmount
- debounced realtime handlers are canceled during teardown

---

## AI Integration (MCP)

The optional **[Model Context Protocol (MCP)](/guides/mcp-setup/)** server (protocol 2026-07-28) exposes 113 tools. Production lifecycle tools use the same database functions as the terminal; other access remains pinned to one workshop with `TENANT_ID`.

**AI agents can:**
- Fetch and update jobs/parts
- Start and complete operations
- Report or resolve quality issues
- Monitor dashboard statistics
- Perform batch operations
- Analyze scrap trends and quality metrics

**Learn more:**
- [MCP Server Setup Guide](/guides/mcp-setup) - Deployment and configuration
- [MCP Demo Guide](/api/mcp-demo-guide) - Usage examples and demo scenarios
- [REST API Documentation](/api/rest-api-reference/) - Underlying API reference

---

## Event System

All major actions (job created, operation started, issue reported) raise events that the dispatcher delivers to the configured webhooks with a signed payload. Delivery runs after the change is committed; a failed delivery never turns a committed change into an error.

---

## Data Portability

- **Export**: Admins can export all tenant data in JSON or CSV (ZIP) formats for backup or migration.
- **Import**: Supports bulk CSV imports for jobs, parts, cells, and resources.

---

## Error Codes & Rate Limiting

### Common Error Codes
- `401 Unauthorized`: Invalid API key.
- `402 Payment Required`: Plan limit reached.
- `404 Not Found`: The record does not exist in your workshop.
- `409 Conflict`: A production rule refused the change; the message is the rule (for example `Stop active work before starting another operation`).
- `429 Too Many Requests`: Rate limit exceeded.

### Rate Limits

**Self-hosted:** No rate limits. You control the infrastructure.

**Hosted trial (eryxon.eu):** Usage limits are shown in the app and may change as the service is developed. Commercial hosting terms are agreed separately.

## Related Docs

- [Security Architecture](/architecture/security-architecture/)
- [REST API Reference](/api/rest-api-reference/)
