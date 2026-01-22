/**
 * Data Validation System
 *
 * Modular validation for MES data with rich logging, HTTP status codes,
 * and user-friendly messages for both mock data generation and API operations.
 */

export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  httpStatus: number; // 200 OK, 400 Bad Request, 422 Unprocessable Entity, etc.
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: string; // User-friendly summary for toast
  technicalDetails: string; // Detailed log message
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint: string; // e.g., "FK_CONSTRAINT", "NOT_NULL", "TYPE_MISMATCH"
  entityType: string;
  entityIndex?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationContext {
  // Available IDs for FK validation
  validJobIds?: string[];
  validPartIds?: string[];
  validCellIds?: string[];
  validOperationIds?: string[];
  validOperatorIds?: string[];
  validResourceIds?: string[];
  validScrapReasonIds?: string[];
  tenantId: string;
}

/**
 * Base validator class
 */
export abstract class BaseValidator<T> {
  protected entityType: string;

  constructor(entityType: string) {
    this.entityType = entityType;
  }

  /**
   * Validate a single entity
   */
  abstract validateEntity(
    entity: T,
    index: number,
    context: ValidationContext,
  ): ValidationError[];

  /**
   * Validate a batch of entities
   */
  validateBatch(entities: T[], context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(entities)) {
      return {
        valid: false,
        severity: ValidationSeverity.ERROR,
        httpStatus: 400,
        errors: [
          {
            field: "root",
            message: `Expected array of ${this.entityType}, got ${typeof entities}`,
            constraint: "TYPE_MISMATCH",
            entityType: this.entityType,
          },
        ],
        warnings: [],
        summary: `Invalid data format for ${this.entityType}`,
        technicalDetails: `Expected array, received ${typeof entities}`,
      };
    }

    if (entities.length === 0) {
      return {
        valid: true,
        severity: ValidationSeverity.INFO,
        httpStatus: 200,
        errors: [],
        warnings: [
          {
            field: "root",
            message: `No ${this.entityType} to validate`,
            suggestion: "This is normal if the dataset is empty",
          },
        ],
        summary: `No ${this.entityType} to process`,
        technicalDetails: `Empty array provided for ${this.entityType}`,
      };
    }

    // Validate each entity
    entities.forEach((entity, index) => {
      const entityErrors = this.validateEntity(entity, index, context);
      errors.push(...entityErrors);
    });

    // Determine result
    const valid = errors.length === 0;
    const httpStatus = valid ? 200 : 422; // 422 Unprocessable Entity for validation errors

    return {
      valid,
      severity: valid ? ValidationSeverity.INFO : ValidationSeverity.ERROR,
      httpStatus,
      errors,
      warnings,
      summary: valid
        ? `✓ ${entities.length} ${this.entityType} validated successfully`
        : `✗ ${errors.length} validation error(s) in ${this.entityType}`,
      technicalDetails: valid
        ? `Validated ${entities.length} ${this.entityType} records with no errors`
        : `Found ${errors.length} validation errors across ${entities.length} ${this.entityType} records:\n${errors.map((e) => `  - [${e.entityIndex}] ${e.field}: ${e.message}`).join("\n")}`,
    };
  }

  /**
   * Helper: Check if field is a valid UUID
   */
  protected isValidUUID(value: any): boolean {
    if (typeof value !== "string") return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Helper: Validate required field
   */
  protected validateRequired(
    entity: any,
    field: string,
    index: number,
  ): ValidationError | null {
    if (!entity[field]) {
      return {
        field,
        message: `Missing required field: ${field}`,
        value: entity[field],
        constraint: "NOT_NULL",
        entityType: this.entityType,
        entityIndex: index,
      };
    }
    return null;
  }

  /**
   * Helper: Validate foreign key
   */
  protected validateForeignKey(
    entity: any,
    field: string,
    validIds: string[] | undefined,
    index: number,
    required: boolean = false,
  ): ValidationError | null {
    const value = entity[field];

    // If field is null/undefined
    if (!value) {
      if (required) {
        return {
          field,
          message: `Missing required foreign key: ${field}`,
          value,
          constraint: "FK_REQUIRED",
          entityType: this.entityType,
          entityIndex: index,
        };
      }
      return null; // Optional FK can be null
    }

    // Check UUID format
    if (!this.isValidUUID(value)) {
      return {
        field,
        message: `Invalid UUID format for ${field}`,
        value,
        constraint: "UUID_FORMAT",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    // Check FK reference exists
    if (validIds && !validIds.includes(value)) {
      return {
        field,
        message: `Foreign key ${field} references non-existent record: ${value}`,
        value,
        constraint: "FK_CONSTRAINT",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    return null;
  }

  /**
   * Helper: Validate number field
   */
  protected validateNumber(
    entity: any,
    field: string,
    index: number,
    options: { min?: number; max?: number; required?: boolean } = {},
  ): ValidationError | null {
    const value = entity[field];

    if (value === null || value === undefined) {
      if (options.required) {
        return {
          field,
          message: `Missing required number field: ${field}`,
          value,
          constraint: "NOT_NULL",
          entityType: this.entityType,
          entityIndex: index,
        };
      }
      return null;
    }

    if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
      return {
        field,
        message: `Invalid number for ${field}`,
        value,
        constraint: "TYPE_MISMATCH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.min !== undefined && value < options.min) {
      return {
        field,
        message: `${field} must be >= ${options.min}`,
        value,
        constraint: "MIN_VALUE",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.max !== undefined && value > options.max) {
      return {
        field,
        message: `${field} must be <= ${options.max}`,
        value,
        constraint: "MAX_VALUE",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    return null;
  }
}
