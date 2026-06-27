---
title: "MQTT & Webhooks"
description: "Outbound integrations for industrial automation and external notifications."
---



Eryxon Flow can push real-time production events to your external systems via Webhooks (HTTP) or MQTT (Industrial Messaging).

---

## Webhooks (Outbound HTTP)

Webhooks send HTTP POST requests to your endpoint when events occur.

### Configuration
1. **URL**: Your HTTPS endpoint.
2. **Events**: Choose from `job.created`, `operation.completed`, `issue.created`, etc.
3. **Secret**: Used for HMAC SHA256 signature verification.

### Signature Verification (Node.js)
```javascript
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', secret);
const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
```

---

## MQTT Publishing (Outbound)

Eryxon publishes events to MQTT brokers using **ISA-95 compliant Unified Namespace (UNS)** topic patterns.

### Topic Variables
Build dynamic topics using variables like `{enterprise}`, `{site}`, `{area}`, `{cell}`, and `{event}`.

Example Pattern:
`{enterprise}/{site}/{area}/{cell}/{event}`
Result:
`acme/chicago/fabrication/laser_cutting/operation/completed`

### Message Payload
```json
{
  "event": "operation.started",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "operation_name": "Laser Cutting",
    "part_number": "BRACKET-A1",
    "operator_name": "John Smith"
  }
}
```

### Reliability

The MQTT client wrapper in `src/lib/mqtt-client.ts` is hardened for shop-floor reliability:

- **Exponential backoff retry** — 3 attempts with increasing delay before giving up on a publish
- **Per-attempt timeout** — each publish attempt has its own deadline so a stuck broker can't wedge the worker
- **Circuit breaker** — after 5 consecutive failures the breaker opens for 30 seconds, dropping new publishes fast instead of piling them up
- **Dead letter logging** — final failures are written to the `mqtt_logs` table with the original payload and error so operators can review and replay
- **Injectable transport** — the wrapper accepts a transport implementation, so deployments can swap broker libraries or stub the transport in tests

If you self-host and need to inspect failed publishes, look at the `mqtt_logs` table. Tenant scope lives on `mqtt_publishers`, so filter by the tenant's publisher IDs and use the `success` boolean:

```sql
SELECT l.*
FROM mqtt_logs l
WHERE l.mqtt_publisher_id IN (
  SELECT id FROM mqtt_publishers WHERE tenant_id = '<your-tenant-id>'
)
  AND l.success = false
ORDER BY l.created_at DESC;
```

---

## Testing Outbound Integrations

### Webhook Testing
- Use a service like `webhook.site` to receive test payloads.
- Trigger an event in Eryxon (e.g., start timing an operation).
- Verify the payload and the `X-Eryxon-Signature` header.

### MQTT Testing
- Use `mosquitto_sub` to listen for messages:
  `mosquitto_sub -h broker.hivemq.com -t "test/#" -v`
- Configure a publisher in Eryxon pointed to the test broker.
- Complete an operation and verify the message arrival.
