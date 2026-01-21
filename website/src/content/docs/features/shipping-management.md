---
title: "Shipping Management"
description: "Documentation for Shipping Management"
---

Eryxon MES includes a shipping management module for production logistics. This is not an ERP shipping slip system - it's designed to help manufacturing floor managers organize and track what's ready to deliver, group shipments efficiently, and monitor delivery status.

---

## Table of Contents

1. [Overview & Use Case](#overview--use-case)
2. [Data Model](#data-model)
3. [Workflow](#workflow)
4. [User Interface](#user-interface)
5. [Operator Guide](#operator-guide)
6. [Admin Configuration](#admin-configuration)
7. [API Integration](#api-integration)
8. [Webhook Events](#webhook-events)
9. [Database Schema](#database-schema)

---

## Overview & Use Case

### What is Shipping Management?

The shipping module bridges the gap between **production completion** and **delivery logistics**. In a manufacturing environment:

1. Jobs (orders) are produced on the shop floor
2. Parts within jobs have physical dimensions and weight
3. Once complete, products need to be grouped and shipped to customers

### Core Value Proposition

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION LOGISTICS FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Jobs Complete] → [Group by Destination] → [Plan Shipment]    │
│         ↓                    ↓                    ↓              │
│  Weight/Volume          Postal Code          Vehicle/Driver     │
│  auto-calculated         grouping             assignment        │
│                              ↓                    ↓              │
│                    [Load Truck] → [In Transit] → [Delivered]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Auto-calculated weights** | Job totals are automatically calculated from part weights and quantities |
| **Postal code grouping** | Completed jobs are grouped by destination for efficient route planning |
| **Capacity planning** | Track weight/volume against vehicle capacity limits |
| **Status tracking** | Full lifecycle: Draft → Planned → Loading → In Transit → Delivered |
| **Multi-job shipments** | Group multiple jobs going to the same region |

### What This Is NOT

- ❌ ERP shipping slips or invoicing
- ❌ Carrier rate shopping or label printing
- ❌ Real-time GPS tracking
- ❌ Customer-facing delivery notifications

This module focuses on **internal logistics coordination** - getting finished goods from the production floor to the loading dock and tracking delivery completion.

---

## Data Model

### Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Job (Order)                                                    │
│  ├── delivery_address, delivery_city, delivery_postal_code     │
│  ├── total_weight_kg (auto-calculated from parts)              │
│  ├── total_volume_m3 (auto-calculated from parts)              │
│  ├── package_count (auto-calculated as parts count)            │
│  │                                                              │
│  └── Parts[] (physical items)                                   │
│      ├── weight_kg                                              │
│      ├── length_mm, width_mm, height_mm                         │
│      └── quantity                                               │
│                                                                 │
│  Shipment                                                       │
│  ├── scheduled_date, scheduled_time                             │
│  ├── vehicle_type, vehicle_id                                   │
│  ├── driver_name, driver_phone                                  │
│  ├── origin (warehouse address)                                 │
│  ├── destination (delivery address)                             │
│  ├── capacity limits (max_weight_kg, max_volume_m3)             │
│  │                                                              │
│  └── ShipmentJobs[] (junction table)                            │
│      ├── job_id                                                 │
│      ├── weight_kg, volume_m3 (snapshot at assignment)          │
│      ├── loading_sequence                                       │
│      ├── loaded_at, delivered_at                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Relationships

1. **Jobs ↔ Parts**: A job contains multiple parts. Each part has physical dimensions.
2. **Jobs ↔ Shipments**: Many-to-many via `shipment_jobs` table.
3. **Auto-calculation**: Database trigger automatically sums part weights/volumes to job totals when parts are added/updated/deleted.

### Weight & Volume Calculation

When parts are modified, a database trigger automatically updates the job:

```sql
-- Triggered on parts INSERT, UPDATE, DELETE
job.total_weight_kg = SUM(parts.weight_kg * parts.quantity)
job.total_volume_m3 = SUM((L * W * H / 1e9) * quantity)
job.package_count = COUNT(parts)
```

This ensures job shipping data is always accurate without manual entry.

---

## Workflow

### Shipment Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  DRAFT  │────▶│ PLANNED │────▶│ LOADING │────▶│IN TRANSIT│────▶│DELIVERED│
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                                                               │
     │                                                               │
     └───────────────────── CANCELLED ◀──────────────────────────────┘
```

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Draft** | Initial state. Jobs can be added/removed. | Add jobs, edit details, delete shipment |
| **Planned** | Shipment details finalized. | Start loading, return to draft |
| **Loading** | Vehicle is being loaded at dock. | Complete loading, mark individual jobs loaded |
| **In Transit** | Vehicle has departed. | Track progress, update ETA |
| **Delivered** | All jobs delivered. | Mark complete, record delivery notes |
| **Cancelled** | Shipment cancelled. | Jobs return to available pool |

### Typical Flow

1. **Production completes jobs** → Jobs appear in "Ready to Ship" view
2. **Logistics coordinator creates shipment** → Specifies vehicle, schedule, route
3. **Coordinator assigns jobs** → Selects from available completed jobs
4. **Loading team loads truck** → Updates status to "Loading"
5. **Driver departs** → Status changes to "In Transit"
6. **Delivery confirmed** → Status changes to "Delivered"

---

## User Interface

### Navigation

Access the shipping module via **Admin Sidebar → Shipping** (truck icon).

### Main Views

#### 1. Shipments Tab

Lists all shipments with status filters. Each shipment card shows:
- Shipment number and name
- Scheduled date/time
- Vehicle type and ID
- Total weight/volume
- Number of jobs assigned
- Current status badge

#### 2. Ready to Ship Tab

Shows completed jobs grouped by postal code for efficient batching:

```
┌─────────────────────────────────────────────────────────────────┐
│  READY TO SHIP                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 🏠 1234 AB - Rotterdam                              │       │
│  │ 5 jobs • 234.5 kg • 2.3 m³                          │       │
│  │ ○ JOB-001 (ACME Corp) - 45.2 kg                     │       │
│  │ ○ JOB-002 (ACME Corp) - 78.1 kg                     │       │
│  │ ○ JOB-007 (Beta Ltd)  - 111.2 kg                    │       │
│  │ [View Jobs] [Create Shipment]                       │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 🏠 5678 CD - Amsterdam                              │       │
│  │ 3 jobs • 156.0 kg • 1.1 m³                          │       │
│  │ ...                                                  │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Create Shipment Dialog

Form fields organized in sections:

**Basic Info:**
- Shipment name (optional friendly name)
- Description/notes

**Schedule & Vehicle:**
- Scheduled date and time
- Vehicle type (truck, van, freight, etc.)
- Vehicle ID / license plate
- Driver name and phone

**Route:**
- Origin address (pickup location)
- Destination address (delivery location)
- Route notes (access codes, special instructions)

**Capacity Limits:**
- Max weight (kg)
- Max volume (m³)

**Assign Jobs:**
- Search and select from completed jobs
- Real-time weight/volume totals
- Over-capacity warnings

---

## Operator Guide

### For Production Workers

**Your role:** Ensure parts have correct shipping data.

When completing an operation on a part:
1. Open the part detail modal
2. Scroll to "Shipping Information" section
3. Enter weight (kg) and dimensions (L×W×H in mm)
4. Save changes

The system automatically calculates volume and updates the job totals.

### For Logistics Coordinators

**Your role:** Create and manage shipments.

#### Daily Workflow

1. **Morning check:** Navigate to Shipping → Ready to Ship
2. **Review grouped jobs:** See which destinations have enough volume
3. **Create shipments:** Click "Create Shipment" for a postal code group
4. **Assign jobs:** Select jobs to include, monitor capacity
5. **Finalize:** Add vehicle/driver details, set schedule
6. **Track:** Monitor status throughout the day

#### Creating an Efficient Shipment

1. Start from "Ready to Ship" tab - jobs are pre-grouped by destination
2. Select a location group with multiple jobs
3. Check combined weight against vehicle capacity
4. Create shipment with appropriate vehicle type
5. Assign all jobs in the group
6. Set loading sequence for unloading order

### For Warehouse/Loading Staff

**Your role:** Load shipments and confirm departure.

1. Check "Loading" status shipments for today
2. View assigned jobs and loading sequence
3. Load items in specified order
4. Mark individual jobs as loaded
5. When complete, update status to "In Transit"

### For Drivers

**Your role:** Confirm deliveries.

Drivers typically don't interact with the MES directly. The logistics coordinator updates status to "Delivered" based on driver confirmation (call, text, or external app).

---

## Admin Configuration

### Setting Up Delivery Addresses

When creating jobs (via UI or API), include delivery information:

```json
{
  "job_number": "JOB-2024-001",
  "customer": "ACME Corp",
  "delivery_address": "123 Industrial Ave",
  "delivery_city": "Rotterdam",
  "delivery_postal_code": "1234 AB",
  "delivery_country": "Netherlands"
}
```

### Adding Part Dimensions

Parts need weight and dimensions for accurate shipping calculations:

```json
{
  "part_number": "BRACKET-A",
  "quantity": 10,
  "weight_kg": 2.5,
  "length_mm": 300,
  "width_mm": 200,
  "height_mm": 50
}
```

### Vehicle Types

Built-in vehicle types:
- Truck
- Van
- Car
- Bike/Courier
- Freight
- Air Freight
- Sea Freight
- Rail
- Other

---

## API Integration

> **Note:** Dedicated shipping API endpoints are planned but not yet implemented. Currently, shipment management is UI-only. The patterns below show the planned API structure.

### Planned Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-shipments` | List shipments with filters |
| `POST` | `/api-shipments` | Create new shipment |
| `PATCH` | `/api-shipments?id={uuid}` | Update shipment |
| `DELETE` | `/api-shipments?id={uuid}` | Delete shipment |
| `POST` | `/api-shipments/{id}/jobs` | Add jobs to shipment |
| `DELETE` | `/api-shipments/{id}/jobs/{job_id}` | Remove job from shipment |
| `POST` | `/api-shipment-lifecycle/start-loading` | Begin loading |
| `POST` | `/api-shipment-lifecycle/depart` | Mark departed |
| `POST` | `/api-shipment-lifecycle/deliver` | Mark delivered |

### Jobs API - Delivery Fields

When creating or updating jobs, include delivery information:

```bash
POST /api-jobs
{
  "job_number": "JOB-2024-001",
  "customer": "ACME Corp",
  "delivery_address": "123 Industrial Ave",
  "delivery_city": "Rotterdam",
  "delivery_postal_code": "1234 AB",
  "delivery_country": "Netherlands",
  "parts": [
    {
      "part_number": "PART-001",
      "quantity": 5,
      "weight_kg": 2.5,
      "length_mm": 300,
      "width_mm": 200,
      "height_mm": 50,
      "operations": [...]
    }
  ]
}
```

### Parts API - Shipping Fields

When creating or updating parts, include physical dimensions:

```bash
POST /api-parts
{
  "job_id": "uuid",
  "part_number": "BRACKET-A",
  "quantity": 10,
  "weight_kg": 2.5,
  "length_mm": 300,
  "width_mm": 200,
  "height_mm": 50
}
```

---

## Webhook Events

### Planned Shipping Events

When the shipping API is implemented, these webhook events will be added:

| Event | Trigger | Payload |
|-------|---------|---------|
| `shipment.created` | New shipment created | Shipment details |
| `shipment.updated` | Shipment modified | Changed fields |
| `shipment.jobs_added` | Jobs assigned to shipment | Job IDs, totals |
| `shipment.jobs_removed` | Jobs removed from shipment | Job IDs |
| `shipment.loading_started` | Status → Loading | Timestamp |
| `shipment.departed` | Status → In Transit | Departure time |
| `shipment.delivered` | Status → Delivered | Delivery time, notes |
| `shipment.cancelled` | Shipment cancelled | Reason |

### Webhook Payload Example (Planned)

```json
{
  "event_type": "shipment.delivered",
  "timestamp": "2024-01-15T16:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "shipment_id": "uuid",
    "shipment_number": "SHP-2024-001",
    "status": "delivered",
    "jobs": [
      {
        "job_id": "uuid",
        "job_number": "JOB-2024-001",
        "delivered_at": "2024-01-15T16:30:00Z"
      }
    ],
    "actual_arrival": "2024-01-15T16:30:00Z",
    "scheduled_date": "2024-01-15",
    "driver_name": "John Driver",
    "delivery_notes": "Left at loading dock"
  }
}
```

---

## Database Schema

### shipments

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Identification
  shipment_number TEXT UNIQUE NOT NULL,
  name TEXT,
  description TEXT,

  -- Status
  status shipment_status DEFAULT 'draft',
  -- Values: draft, planned, loading, in_transit, delivered, cancelled

  -- Schedule
  scheduled_date DATE,
  scheduled_time TIME,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,

  -- Vehicle
  vehicle_type TEXT,
  vehicle_id TEXT,
  driver_name TEXT,
  driver_phone TEXT,

  -- Origin
  origin_name TEXT,
  origin_address TEXT,
  origin_postal_code TEXT,
  origin_city TEXT,
  origin_country TEXT,

  -- Destination
  destination_name TEXT,
  destination_address TEXT,
  destination_postal_code TEXT,
  destination_city TEXT,
  destination_country TEXT,

  -- Capacity
  max_weight_kg DECIMAL(10,2),
  max_volume_m3 DECIMAL(10,6),
  current_weight_kg DECIMAL(10,2) DEFAULT 0,
  current_volume_m3 DECIMAL(10,6) DEFAULT 0,

  -- Notes
  route_notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### shipment_jobs

```sql
CREATE TABLE shipment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Shipping data (snapshot at assignment)
  weight_kg DECIMAL(10,2),
  volume_m3 DECIMAL(10,6),
  packages_count INTEGER DEFAULT 1,

  -- Loading
  loading_sequence INTEGER,
  loaded_at TIMESTAMPTZ,

  -- Delivery
  delivered_at TIMESTAMPTZ,
  delivery_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shipment_id, job_id)
);
```

### jobs (extended fields)

```sql
-- Added columns for shipping
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postal_code TEXT,
  delivery_country TEXT,
  total_weight_kg DECIMAL(10,2),   -- Auto-calculated from parts
  total_volume_m3 DECIMAL(10,6),   -- Auto-calculated from parts
  package_count INTEGER;            -- Auto-calculated from parts
```

### parts (extended fields)

```sql
-- Added columns for shipping
ALTER TABLE parts ADD COLUMN IF NOT EXISTS
  weight_kg DECIMAL(10,2),
  length_mm DECIMAL(10,2),
  width_mm DECIMAL(10,2),
  height_mm DECIMAL(10,2);
```

### Auto-calculation Trigger

```sql
-- Trigger on parts table
CREATE TRIGGER trigger_update_job_shipping_totals
AFTER INSERT OR UPDATE OF weight_kg, length_mm, width_mm, height_mm, quantity, job_id
    OR DELETE ON public.parts
FOR EACH ROW
EXECUTE FUNCTION update_job_shipping_totals();
```

This trigger automatically recalculates `total_weight_kg`, `total_volume_m3`, and `package_count` on the parent job whenever parts are modified.

---

## Future Enhancements

Potential future additions to the shipping module:

1. **API Endpoints** - Full REST API for programmatic shipment management
2. **Carrier Integration** - Connect to shipping carriers for rate quotes and tracking
3. **Route Optimization** - Suggest optimal delivery routes based on locations
4. **Mobile App** - Driver mobile app for delivery confirmation
5. **Customer Notifications** - Automated delivery status emails/SMS
6. **Proof of Delivery** - Photo/signature capture at delivery
7. **Analytics Dashboard** - Delivery performance metrics and trends

---

## Related Documentation

- [REST API Overview](/architecture/connectivity-rest-api/) - Endpoints and auth
- [ERP Integration](/features/erp-integration/) - Syncing jobs with delivery addresses from ERP
- Swagger/OpenAPI - Available in the app at `/api-docs`
