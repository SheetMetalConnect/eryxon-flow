---
title: "Connectivity Overview"
description: "Integration architecture, authentication, and real-time connectivity options."
---



Eryxon Flow provides multiple connectivity options for integrating with external systems, industrial automation, and AI agents.

## Integration Architecture

Eryxon Flow uses a **Unified Event Dispatcher** to coordinate communication across different protocols.

- **Inbound**: [REST API](/architecture/connectivity-rest-api), Real-time WebSockets, [MCP (AI)](/guides/mcp-setup).
- **Outbound**: [Webhooks](/architecture/connectivity-mqtt) (HTTP POST), [MQTT](/architecture/connectivity-mqtt) (industrial messaging).
- **Bidirectional**: ERP Sync, [Model Context Protocol (MCP)](/guides/mcp-setup).

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
Model Context Protocol keys are configured separately in the Admin panel to allow AI agents like Claude to securely interact with your shop floor data. See the [MCP Server Setup Guide](/guides/mcp-setup) for complete deployment instructions.

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

The **[Model Context Protocol (MCP)](/guides/mcp-setup)** enables AI agents to interact with Eryxon Flow programmatically through 50 specialized tools across 9 modules.

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
- [REST API Documentation](/architecture/connectivity-rest-api) - Underlying API reference

---

## Event System

All major actions (job created, operation started, issue reported) trigger events in our internal dispatcher, which then forwards the data to configured Webhooks and MQTT brokers simultaneously.

---

## Data Portability

- **Export**: Admins can export all tenant data in JSON or CSV (ZIP) formats for backup or migration.
- **Import**: Supports bulk CSV imports for jobs, parts, cells, and resources.

---

## Error Codes & Rate Limiting

### Common Error Codes
- `401 Unauthorized`: Invalid API key.
- `402 Payment Required`: Plan limit reached.
- `429 Too Many Requests`: Rate limit exceeded.

### Rate Limits

**Self-hosted:** No rate limits. You control the infrastructure.

**Cloud (eryxon.eu):** Limits are enforced per tenant plan:

- Free: 100 requests/day
- Pro: 1,000 requests/day
- Premium: 10,000 requests/day
- Enterprise: unlimited

## Related Docs

- [Security Architecture](/architecture/security-architecture/)
- [REST API Reference](/api/rest-api-reference/)
