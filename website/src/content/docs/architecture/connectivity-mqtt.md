---
title: "MQTT & Webhooks"
description: "Outbound integrations for industrial automation"
---

:::caution[Work in Progress]
MQTT and Webhooks are under active development and **not production-ready**. APIs may change.
:::

Push real-time production events to external systems via Webhooks (HTTP) or MQTT (Industrial Messaging).

See also: [Connectivity Overview](/architecture/connectivity-overview/), [REST API](/api/api_documentation/), [ERP Integration](/features/erp-integration/)

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
