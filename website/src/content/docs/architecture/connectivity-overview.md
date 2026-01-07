---
title: "Connectivity Overview"
description: "Integration architecture, authentication, and real-time connectivity options."
---



Eryxon MES provides a comprehensive set of connectivity options for integrating with external systems, industrial automation, and AI agents.

## Integration Architecture

Eryxon MES uses a **Unified Event Dispatcher** to coordinate communication across different protocols.

- **Inbound**: REST API, Real-time WebSockets, MCP (AI).
- **Outbound**: Webhooks (HTTP POST), MQTT (industrial messaging).
- **Bidirectional**: ERP Sync, Model Context Protocol (MCP).

---

## Authentication

### API Key Authentication
All external API calls require a Bearer token:
```http
Authorization: Bearer ery_live_xxxxxxxxxxxxxxxxxxxx
```
- `ery_live_`: Production keys.
- `ery_test_`: Sandbox/testing keys.

### MCP Authentication
Model Context Protocol keys are configured separately in the Admin panel to allow AI agents like Claude to securely interact with your shop floor data.

---

## Real-time Subscriptions (Inbound)

Eryxon uses Supabase Realtime (WebSockets) to push updates to the frontend and connected clients instantly.

### Hooks for Developers
We provide several React hooks to simplify real-time data binding:
- `useTableSubscription`: Simple single-table listener.
- `useTenantSubscription`: Automatically filters by the current tenant.
- `useEntitySubscription`: Listens for changes to a specific record (e.g., one operation).

---

## AI Integration (MCP)

The **Model Context Protocol (MCP)** enables AI agents to interact with Eryxon MES programmatically. AI agents can:
- Fetch and update jobs/parts.
- Start and complete operations.
- Report or resolve quality issues.
- Monitor dashboard statistics.

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
Limits are applied per API key and vary by subscription plan (e.g., Free: 60 RPM, Professional: 1,000 RPM).
