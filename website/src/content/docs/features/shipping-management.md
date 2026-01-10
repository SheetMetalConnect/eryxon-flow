---
title: "Shipping Management"
description: "Internal logistics for completed jobs"
---

:::caution[Work in Progress]
This feature is under active development and **not production-ready**. Schema and APIs may change.
:::

Shipping module for production logistics - group completed jobs by destination, assign to vehicles, track delivery. Not an ERP shipping system.

**Key features:**
- Auto-calculated weights/volumes from parts
- Jobs grouped by postal code
- Capacity planning (weight/volume limits)
- Status tracking: `draft` → `planned` → `loading` → `in_transit` → `delivered`

## Data Model

```
Job (with delivery fields)
├── delivery_address, delivery_postal_code
├── total_weight_kg, total_volume_m3 (auto-calculated)
└── Parts[] (each has weight_kg, dimensions)

Shipment
├── scheduled_date/time, vehicle_type, driver
├── origin/destination addresses
├── capacity limits (max_weight_kg, max_volume_m3)
└── ShipmentJobs[] (junction: job_id, loading_sequence, loaded_at)
```

**Auto-calculation:** Database trigger updates job totals when parts change.

## Workflow

1. Jobs complete → appear in "Ready to Ship" grouped by postal code
2. Coordinator creates shipment → assigns vehicle, schedule
3. Assigns jobs → selects from available completed jobs
4. Loading → mark jobs loaded
5. Departure → status `in_transit`
6. Delivery confirmed → status `delivered`

## Usage

**Navigation:** Admin Sidebar → Shipping

**Tabs:**
- **Shipments** — List/filter shipments by status
- **Ready to Ship** — Completed jobs grouped by postal code

**Create shipment:** Select jobs from a postal code group → add vehicle/schedule → monitor capacity → track status.

**Production workers:** Enter weight/dimensions on parts (auto-calculates job totals).

## Configuration

Include delivery fields when creating jobs:

```json
{
  "delivery_address": "123 Industrial Ave",
  "delivery_city": "Rotterdam",
  "delivery_postal_code": "1234 AB"
}
```

Part shipping fields: `weight_kg`, `length_mm`, `width_mm`, `height_mm`

Vehicle types: Truck, Van, Car, Bike/Courier, Freight, Air/Sea/Rail Freight, Other

## API (Planned)

> Shipment API endpoints are not yet implemented. UI-only for now.

**Planned endpoints:** `/api-shipments` (CRUD), `/api-shipment-lifecycle/*` (start-loading, depart, deliver)

For now, use existing Jobs/Parts API with delivery/shipping fields. See [API Documentation](/api/api_documentation/).

## Database

**Tables:** `shipments`, `shipment_jobs` (junction)

**Job fields:** `delivery_address`, `delivery_postal_code`, `total_weight_kg` (auto-calculated)

**Part fields:** `weight_kg`, `length_mm`, `width_mm`, `height_mm`

Auto-calculation trigger updates job totals when parts change.
