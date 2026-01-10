---
title: "Flexible Metadata"
description: "Custom fields for jobs, parts, operations, and resources"
---

Store custom data on jobs, parts, operations, and resources via JSONB `metadata` fields. Includes templates for common manufacturing scenarios.

## Features

- Type-safe metadata schemas with TypeScript definitions
- Templates: bending, welding, machining, laser cutting, assembly, inspection
- Auto-detection shows appropriate UI based on field names
- Resource linking: molds, tooling, fixtures, materials → operations
- Operators see all metadata and resource requirements in task views

## Metadata Templates

**Resources:** Mold, Tooling, Fixture, Material
**Processes:** Bend Sequence, Welding, Laser Cutting, Machine Settings, Assembly, Inspection

Example - Welding metadata:
```typescript
{ weldType: 'MIG', amperage: 150, voltage: 22, shieldingGas: 'CO2/Argon Mix' }
```

## Usage

**Adding to resources:** Configuration → Resources → Templates tab → select template → fill fields

**Linking to operations:** Assign resources during job creation or via operation edit. Specify quantity and notes.

**Operator view:** Task modal shows process settings, part specs, and required resources with locations.

## Tables with Metadata

| Table | Field | Purpose |
|-------|-------|---------|
| jobs | `metadata` | Order-level custom data |
| parts | `metadata` | Part specs (material, dimensions) |
| operations | `metadata` | Process parameters |
| resources | `metadata` | Resource specs (calibration, capacity) |

Junction table `operation_resources` links operations to resources with quantity and notes.

## Type Detection

System auto-detects metadata type by field names:
- `moldId` → Mold template view
- `bendCount` + `bends[]` → Bend Sequence view
- `weldType` + `amperage` → Welding view

See `src/types/metadata.ts` for full type definitions.
