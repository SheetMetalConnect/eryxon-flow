---
title: "Flexible Metadata System Guide"
description: "Documentation for Flexible Metadata System Guide"
---

## Overview

The Eryxon Flow flexible metadata system allows you to store and manage custom data for jobs, parts, operations, and resources. This system includes pre-defined templates for common manufacturing scenarios while remaining flexible enough to accommodate custom fields.

## Key Features

- **Type-Safe Metadata Schemas**: Pre-defined TypeScript types for common metadata structures
- **Template System**: Ready-to-use templates for bending, welding, machining, laser cutting, assembly, inspection, and resource management
- **Smart Type Detection**: Automatically recognizes metadata type and displays appropriate UI
- **Resource Management**: Link reusable resources (molds, tooling, fixtures, materials) to operations
- **Operator Visibility**: Operators see all relevant metadata and resource requirements in task views
- **Custom Fields**: Always supports custom key-value pairs beyond templates

## Metadata Types

### Resource Metadata

#### Mold Metadata
```typescript
{
  moldId: string;
  moldName: string;
  cavities: number;
  tonnage: number;
  setupTime: number; // minutes
  cycleTime: number; // seconds
  temperature: number;
  pressure: number;
  notes: string;
}
```

#### Tooling Metadata
```typescript
{
  toolId: string;
  toolName: string;
  toolType: 'punch' | 'die' | 'cutting' | 'forming' | 'welding' | 'other';
  diameter: number;
  length: number;
  material: string;
  setupTime: number;
  notes: string;
}
```

#### Fixture Metadata
```typescript
{
  fixtureId: string;
  fixtureName: string;
  fixtureType: 'welding' | 'assembly' | 'inspection' | 'machining' | 'other';
  setupTime: number;
  calibrationDue: string; // ISO date
  location: string;
  notes: string;
}
```

#### Material Metadata
```typescript
{
  materialType: string;
  grade: string;
  thickness: string;
  width: number;
  length: number;
  weight: number;
  finish: string;
  supplier: string;
  lotNumber: string;
  notes: string;
}
```

### Process-Specific Metadata

#### Bend Sequence Metadata
```typescript
{
  bendCount: number;
  bends: Array<{
    sequence: number;
    angle: number;
    radius: number;
    direction: 'up' | 'down';
    tooling: string;
  }>;
  material: string;
  thickness: string;
  bendAllowance: number;
  notes: string;
}
```

#### Welding Metadata
```typescript
{
  weldType: 'MIG' | 'TIG' | 'Stick' | 'Spot' | 'Other';
  material: string;
  thickness: string;
  amperage: number;
  voltage: number;
  wireSpeed: number;
  shieldingGas: string;
  gasFlowRate: number;
  preHeat: number;
  inspectionRequired: boolean;
  notes: string;
}
```

#### Laser Cutting Metadata
```typescript
{
  material: string;
  thickness: string;
  power: number; // watts
  speed: number; // mm/min
  gasType: string;
  gasPressure: number;
  program: string;
  notes: string;
}
```

#### Machine Settings Metadata
```typescript
{
  machineId: string;
  program: string;
  feedRate: number;
  spindleSpeed: number;
  cutDepth: number;
  coolant: boolean;
  setupTime: number;
  cycleTime: number;
  notes: string;
}
```

#### Assembly Metadata
```typescript
{
  assemblyName: string;
  componentCount: number;
  components: Array<{
    partNumber: string;
    quantity: number;
  }>;
  assemblySequence: string[];
  cureTime: number;
  notes: string;
}
```

#### Inspection Metadata
```typescript
{
  inspectionType: 'visual' | 'dimensional' | 'functional' | 'CMM' | 'other';
  checkpoints: Array<{
    name: string;
    specification: string;
    tolerance: string;
  }>;
  acceptanceCriteria: string;
  notes: string;
}
```

## Using the Metadata System

### 1. Adding Metadata to Resources

When creating or editing a resource in **Configuration → Resources**:

1. Fill in basic resource information (name, type, identifier, location)
2. Click the **Templates** tab in the metadata section
3. Select an appropriate template for the resource type (e.g., "Mold" for mold resources)
4. Fill in the template fields
5. Add any additional custom fields in the **Manual Entry** tab if needed

**Example: Creating a Mold Resource**
```
Name: "Form-123"
Type: "Mold"
Identifier: "MOLD-123"
Location: "Shelf A3"

Metadata (using Mold template):
- Mold ID: MOLD-123
- Cavities: 4
- Tonnage: 50 tons
- Setup Time: 30 minutes
- Cycle Time: 45 seconds
- Temperature: 200°C
- Pressure: 1500 PSI
```

### 2. Linking Resources to Operations

Resources can be linked to operations in two ways:

**Option A: During Job/Part Creation**
- When creating operations, you can assign resources to each operation
- Specify quantity and any special instructions

**Option B: Via Operation Management**
- Edit an existing operation
- Add required resources from the resource library
- Specify quantity and operation-specific notes

### 3. Adding Process Metadata to Operations

Operations can have process-specific metadata that operators need to follow:

**Example: Welding Operation**
1. Create or edit an operation
2. In the metadata section, select the "Welding Parameters" template
3. Fill in:
   - Weld Type: MIG
   - Material: Steel
   - Thickness: 3mm
   - Amperage: 150A
   - Voltage: 22V
   - Shielding Gas: CO2/Argon Mix
   - Special Instructions: "Preheat to 200°F before welding"

### 4. Operator View

When an operator opens a task, they will see:

1. **Process Settings** - Operation metadata displayed with recognizable icons
2. **Part Specifications** - Part metadata with material and dimension info
3. **Required Resources** - Each resource with:
   - Resource name and status
   - Type and location
   - Quantity required
   - Special instructions (highlighted)
   - Detailed resource specifications (from metadata)

## File Structure

```
src/
├── types/
│   └── metadata.ts                    # All metadata type definitions and templates
├── components/
│   └── ui/
│       ├── MetadataInput.tsx          # Template-based metadata input component
│       ├── EnhancedMetadataDisplay.tsx # Smart metadata display with type recognition
│       └── MetadataDisplay.tsx        # Legacy generic display (still used)
├── pages/
│   └── admin/
│       └── ConfigResources.tsx        # Resource management with metadata support
├── components/
│   └── operator/
│       └── OperationDetailModal.tsx   # Operator task view with enhanced metadata
└── integrations/
    └── supabase/
        └── types.ts                   # Database types including metadata fields

supabase/
└── migrations/
    └── 20251117200200_add_operations_metadata.sql  # Migration adding operations.metadata
```

## Database Schema

### Tables with Metadata Support

1. **jobs** - `metadata JSONB`
2. **parts** - `metadata JSONB`
3. **operations** - `metadata JSONB` (newly added)
4. **resources** - `metadata JSONB`

### Resource Linking

**operation_resources** junction table:
- Links operations to resources
- Includes `quantity` and `notes` for operation-specific instructions

## Best Practices

### 1. Use Templates When Available
- Templates provide consistent data structure
- Make it easier for operators to find information
- Enable smart type detection and specialized displays

### 2. Add Operation-Specific Instructions
When linking resources to operations, use the `notes` field to provide context:
- ✅ "Use with 45° angle adapter"
- ✅ "Requires calibration check before use"
- ✅ "Handle with care - fragile tooling"

### 3. Keep Part Metadata Focused
Part metadata should describe the part itself, not the processes:
- ✅ Material, dimensions, weight, finish, tolerances
- ❌ Don't put machine settings in part metadata (use operation metadata)

### 4. Use Process Metadata for Operation Settings
Operation metadata should contain process-specific settings:
- ✅ Welding parameters, bend sequences, machine programs
- ✅ Setup instructions, quality checkpoints
- ❌ Don't duplicate part specifications

### 5. Maintain Resource Metadata
Keep resource metadata up to date:
- Update calibration dates
- Track tool life and maintenance
- Note any special handling requirements

## Examples

### Example 1: Sheet Metal Bending Operation

**Part Metadata:**
```json
{
  "material": "AL6061-T6",
  "thickness": "3mm",
  "dimensions": "400x300mm",
  "finish": "Brushed"
}
```

**Operation Metadata (Bending template):**
```json
{
  "bendCount": 3,
  "bends": [
    {
      "sequence": 1,
      "angle": 90,
      "radius": 3,
      "direction": "up",
      "tooling": "V-Die 3mm"
    },
    {
      "sequence": 2,
      "angle": 45,
      "radius": 3,
      "direction": "down",
      "tooling": "V-Die 3mm"
    }
  ],
  "notes": "Check spring-back after first bend"
}
```

**Linked Resources:**
- Tooling: "V-Die 3mm Radius" (Qty: 1)
  - Notes: "Ensure die is clean before use"
- Fixture: "Aluminum Bending Fixture" (Qty: 1)

### Example 2: Welding Assembly

**Operation Metadata (Welding template):**
```json
{
  "weldType": "TIG",
  "material": "Stainless Steel 304",
  "thickness": "2mm",
  "amperage": 120,
  "voltage": 18,
  "shieldingGas": "Pure Argon",
  "gasFlowRate": 15,
  "preHeat": 0,
  "inspectionRequired": true,
  "notes": "Weld in sequence: corners first, then edges"
}
```

**Linked Resources:**
- Fixture: "Welding Jig WJ-042" (Qty: 1)
  - Metadata includes calibration date and setup instructions
- Material: "Argon Gas Cylinder" (Qty: 1)
  - Metadata includes pressure settings and safety notes

### Example 3: CNC Machining

**Operation Metadata (Machining template):**
```json
{
  "machineId": "CNC-001",
  "program": "PART_456_OP10.nc",
  "feedRate": 1500,
  "spindleSpeed": 8000,
  "cutDepth": 2,
  "coolant": true,
  "setupTime": 45,
  "cycleTime": 22,
  "notes": "Zero on part top, southwest corner"
}
```

**Linked Resources:**
- Tooling: "End Mill 6mm Carbide" (Qty: 2)
  - Metadata includes tool life tracking
- Fixture: "Vise Soft Jaws SJ-123" (Qty: 1)

## Type Detection Algorithm

The system automatically detects metadata type based on field names:

```typescript
// Examples of detection:
{ moldId: "..." } → Detected as "Mold"
{ toolId: "..." } → Detected as "Tooling"
{ bendCount: 3, bends: [...] } → Detected as "Bend Sequence"
{ weldType: "MIG", amperage: 150 } → Detected as "Welding"
{ power: 3000, speed: 1200 } → Detected as "Laser Cutting"
```

This enables the system to show specialized views with appropriate icons and formatting.

## API Usage

### Querying Metadata

```typescript
// Get resources with specific metadata
const { data } = await supabase
  .from('resources')
  .select('*')
  .eq('type', 'tooling')
  .not('metadata', 'is', null);

// Filter by metadata field (requires GIN index)
const { data } = await supabase
  .from('operations')
  .select('*')
  .contains('metadata', { weldType: 'TIG' });
```

### Updating Metadata

```typescript
// Update operation metadata
await supabase
  .from('operations')
  .update({
    metadata: {
      weldType: 'MIG',
      amperage: 150,
      voltage: 22,
      // ... other fields
    }
  })
  .eq('id', operationId);
```

## Future Enhancements

Potential improvements to consider:

1. **Metadata Validation** - Enforce required fields based on template
2. **Metadata Search** - Full-text search across metadata fields
3. **Metadata History** - Track changes to metadata over time
4. **Conditional Fields** - Show/hide fields based on other values
5. **Metadata Import/Export** - Bulk import from spreadsheets
6. **Resource Availability** - Real-time resource scheduling
7. **Metadata Templates per Tenant** - Custom templates per organization

## Support

For questions or issues with the metadata system:
- Check this documentation
- Review example implementations in the codebase
- Consult the TypeScript type definitions in `src/types/metadata.ts`

---

**Last Updated:** 2025-11-17
**Version:** 1.0.0
