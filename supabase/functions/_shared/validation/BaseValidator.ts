/**
 * Base Validator Class for Edge Functions
 * Ported from src/lib/validation/DataValidator.ts
 */

import {
  ValidationContext,
  ValidationError,
  ValidationResult,
  ValidationSeverity,
  ValidationWarning,
} from "./types.ts";

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
   * Validate a single entity (convenience method)
   */
  validate(entity: T, context: ValidationContext): ValidationResult {
    return this.validateBatch([entity], context);
  }

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
    const httpStatus = valid ? 200 : 422;

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
        : `Found ${errors.length} validation errors across ${entities.length} ${this.entityType} records:\n${
          errors
            .map((e) => `  - [${e.entityIndex}] ${e.field}: ${e.message}`)
            .join("\n")
        }`,
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
    const value = entity[field];
    if (value === null || value === undefined || value === "") {
      return {
        field,
        message: `Missing required field: ${field}`,
        value,
        constraint: "NOT_NULL",
        entityType: this.entityType,
        entityIndex: index,
      };
    }
    return null;
  }

  /**
   * Helper: Validate string field
   */
  protected validateString(
    entity: any,
    field: string,
    index: number,
    options: {
      minLength?: number;
      maxLength?: number;
      required?: boolean;
      pattern?: RegExp;
    } = {},
  ): ValidationError | null {
    const value = entity[field];

    if (value === null || value === undefined || value === "") {
      if (options.required) {
        return {
          field,
          message: `Missing required string field: ${field}`,
          value,
          constraint: "NOT_NULL",
          entityType: this.entityType,
          entityIndex: index,
        };
      }
      return null;
    }

    if (typeof value !== "string") {
      return {
        field,
        message: `Invalid string for ${field}`,
        value,
        constraint: "TYPE_MISMATCH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.minLength !== undefined && value.length < options.minLength) {
      return {
        field,
        message: `${field} must be at least ${options.minLength} characters`,
        value,
        constraint: "MIN_LENGTH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      return {
        field,
        message: `${field} must be at most ${options.maxLength} characters`,
        value,
        constraint: "MAX_LENGTH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.pattern && !options.pattern.test(value)) {
      return {
        field,
        message: `${field} does not match required pattern`,
        value,
        constraint: "PATTERN_MISMATCH",
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
      return null;
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
    options: {
      min?: number;
      max?: number;
      required?: boolean;
      integer?: boolean;
    } = {},
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

    if (options.integer && !Number.isInteger(value)) {
      return {
        field,
        message: `${field} must be an integer`,
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

  /**
   * Helper: Validate enum field
   */
  protected validateEnum(
    entity: any,
    field: string,
    validValues: string[],
    index: number,
    required: boolean = false,
  ): ValidationError | null {
    const value = entity[field];

    if (value === null || value === undefined || value === "") {
      if (required) {
        return {
          field,
          message: `Missing required enum field: ${field}`,
          value,
          constraint: "NOT_NULL",
          entityType: this.entityType,
          entityIndex: index,
        };
      }
      return null;
    }

    if (!validValues.includes(value)) {
      return {
        field,
        message: `Invalid value for ${field}. Must be one of: ${validValues.join(", ")}`,
        value,
        constraint: "ENUM_CONSTRAINT",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    return null;
  }

  /**
   * Helper: Validate date field
   */
  protected validateDate(
    entity: any,
    field: string,
    index: number,
    required: boolean = false,
  ): ValidationError | null {
    const value = entity[field];

    if (value === null || value === undefined || value === "") {
      if (required) {
        return {
          field,
          message: `Missing required date field: ${field}`,
          value,
          constraint: "NOT_NULL",
          entityType: this.entityType,
          entityIndex: index,
        };
      }
      return null;
    }

    // Try to parse as date
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        field,
        message: `Invalid date format for ${field}`,
        value,
        constraint: "DATE_FORMAT",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    return null;
  }

  /**
   * Helper: Validate array field
   */
  protected validateArray(
    entity: any,
    field: string,
    index: number,
    options: { minLength?: number; maxLength?: number; required?: boolean } = {},
  ): ValidationError | null {
    const value = entity[field];

    if (value === null || value === undefined) {
      if (options.required) {
        return {
          field,
          message: `Missing required array field: ${field}`,
          value,
          constraint: "NOT_NULL",
          entityType: this.entityType,
          entityIndex: index,
        };
      }
      return null;
    }

    if (!Array.isArray(value)) {
      return {
        field,
        message: `Invalid array for ${field}`,
        value,
        constraint: "TYPE_MISMATCH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.minLength !== undefined && value.length < options.minLength) {
      return {
        field,
        message: `${field} must have at least ${options.minLength} items`,
        value: value.length,
        constraint: "MIN_LENGTH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      return {
        field,
        message: `${field} must have at most ${options.maxLength} items`,
        value: value.length,
        constraint: "MAX_LENGTH",
        entityType: this.entityType,
        entityIndex: index,
      };
    }

    return null;
  }
}
