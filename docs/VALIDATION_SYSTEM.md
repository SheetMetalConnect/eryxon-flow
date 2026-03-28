# Data Validation System

A comprehensive, modular validation system for MES data with rich logging, HTTP status codes, and user-friendly messages.

## Features

- ✅ **Modular validators** - Separate validator for each entity type
- ✅ **FK/PK validation** - Validates all foreign key relationships before insertion
- ✅ **Rich logging** - Console logs with HTTP status codes (200, 400, 422, etc.)
- ✅ **User-friendly messages** - Toast-ready messages for UI feedback
- ✅ **API-ready** - Format responses for RESTful APIs
- ✅ **Type-safe** - Full TypeScript support

## Quick Start

### Basic Usage

```typescript
import {
  ValidationContext,
  ValidationLogger,
  ValidatorFactory,
} from "@/lib/validation";

// Create validation context with available IDs
const context: ValidationContext = {
  tenantId: "your-tenant-id",
  validJobIds: ["job-id-1", "job-id-2"],
  validPartIds: ["part-id-1", "part-id-2"],
  validCellIds: ["cell-id-1", "cell-id-2"],
  // ... other valid IDs
};

// Create logger
const logger = new ValidationLogger();

// Get validator for your entity type
const validator = ValidatorFactory.getValidator("operations");

// Validate your data
const result = validator.validateBatch(operations, context);

// Log the result
logger.logValidation(result, "operations");

// Check if validation passed
if (!result.valid) {
  console.error("Validation failed:", result.errors);
  throw new Error(result.summary);
}

// Insert data if valid
await supabase.from("operations").insert(operations);
```

### Mock Data Generation Example

```typescript
import { generateMockData } from "@/lib/mockDataGenerator";

// The mock generator now uses validation internally
const result = await generateMockData(tenantId);

if (result.success) {
  console.log("✓ Mock data created and validated");
} else {
  console.error("✗ Validation failed:", result.error);
}
```

## Available Validators

- `CellValidator` - Validates manufacturing cells
- `JobValidator` - Validates jobs/work orders
- `PartValidator` - Validates parts (includes parent_part_id FK check)
- `OperationValidator` - Validates operations
- `TimeEntryValidator` - Validates time tracking entries
- `QuantityRecordValidator` - Validates quantity/scrap records
- `IssueValidator` - Validates issues/NCRs
- `OperationResourceValidator` - Validates operation-resource links

## Validation Context

The `ValidationContext` object contains all valid IDs for FK validation:

```typescript
interface ValidationContext {
  validJobIds?: string[];        // For parts.job_id
  validPartIds?: string[];       // For operations.part_id, parts.parent_part_id
  validCellIds?: string[];       // For operations.cell_id
  validOperationIds?: string[];  // For time_entries.operation_id, issues.operation_id
  validOperatorIds?: string[];   // For time_entries.operator_id, issues.created_by
  validResourceIds?: string[];   // For operation_resources.resource_id
  validScrapReasonIds?: string[]; // For quantity_records.scrap_reason_id
  tenantId: string;              // Required tenant ID
}
```

## Validation Results

Each validation returns a `ValidationResult`:

```typescript
interface ValidationResult {
  valid: boolean;                // Overall validation status
  severity: ValidationSeverity;  // ERROR | WARNING | INFO
  httpStatus: number;            // 200 OK | 422 Unprocessable Entity | 400 Bad Request
  errors: ValidationError[];     // Array of validation errors
  warnings: ValidationWarning[]; // Array of warnings
  summary: string;               // User-friendly summary (for toasts)
  technicalDetails: string;      // Detailed technical log message
}
```

## HTTP Status Codes

The validation system uses proper HTTP status codes:

- `200 OK` - Validation passed
- `400 Bad Request` - Invalid data format (e.g., not an array)
- `422 Unprocessable Entity` - Validation errors (FK violations, type mismatches, etc.)

## Error Types

Each validation error includes a constraint type:

- `NOT_NULL` - Required field is missing
- `FK_CONSTRAINT` - Foreign key references non-existent record
- `FK_REQUIRED` - Required foreign key is missing
- `UUID_FORMAT` - Invalid UUID format
- `TYPE_MISMATCH` - Wrong data type (e.g., string instead of number)
- `MIN_VALUE` - Numeric value below minimum
- `MAX_VALUE` - Numeric value above maximum

## Logging

The `ValidationLogger` provides rich console logging:

```typescript
const logger = new ValidationLogger();

// Log validation results
logger.logValidation(result, "operations");

// Get summary
const summary = logger.getSummary();
// { totalValidations: 5, passed: 4, failed: 1, warnings: 0 }

// Get toast message
const toast = logger.getToastMessage();
// { title: "...", description: "...", variant: "destructive" | "success" }

// Get all logs
const logs = logger.getLogs();
```

## API Response Formatting

For RESTful APIs, use `APIResponseFormatter`:

```typescript
import { APIResponseFormatter } from "@/lib/validation";

// Format single validation
const response = APIResponseFormatter.formatResponse(result, "CREATE");
// {
//   status: 422,
//   success: false,
//   message: "Validation failed",
//   errors: [...],
//   data: undefined
// }

// Format batch operations
const batchResponse = APIResponseFormatter.formatBatchResponse(results, "CREATE");
// {
//   status: 200,
//   success: true,
//   summary: { total: 10, successful: 10, failed: 0 },
//   results: [...]
// }
```

## Example: Validating Operations Before Insert

```typescript
import {
  ValidationContext,
  ValidationLogger,
  OperationValidator,
} from "@/lib/validation";

async function insertOperations(operations: any[], tenantId: string) {
  // Fetch valid IDs from database
  const { data: parts } = await supabase
    .from("parts")
    .select("id")
    .eq("tenant_id", tenantId);

  const { data: cells } = await supabase
    .from("cells")
    .select("id")
    .eq("tenant_id", tenantId);

  // Build validation context
  const context: ValidationContext = {
    tenantId,
    validPartIds: parts?.map((p) => p.id) || [],
    validCellIds: cells?.map((c) => c.id) || [],
  };

  // Validate
  const logger = new ValidationLogger();
  const validator = new OperationValidator();
  const result = validator.validateBatch(operations, context);

  logger.logValidation(result, "operations");

  if (!result.valid) {
    throw new Error(result.summary);
  }

  // Insert if valid
  const { error } = await supabase.from("operations").insert(operations);

  if (error) throw error;

  return { success: true, count: operations.length };
}
```

## Best Practices

1. **Always validate before insert** - Catch errors early with clear messages
2. **Build proper context** - Include all valid IDs for FK validation
3. **Use the logger** - Rich console output helps debugging
4. **Handle validation errors gracefully** - Show user-friendly messages in UI
5. **Log validation results** - Track what was validated and what failed

## Future Extensions

This validation system can be extended for:

- ✨ Custom validation rules per tenant
- ✨ Async validation with database lookups
- ✨ Validation caching for performance
- ✨ Webhook notifications on validation failures
- ✨ Validation history tracking
