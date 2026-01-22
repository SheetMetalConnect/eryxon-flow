/**
 * Data Validation System - Public API
 *
 * Export all validators, loggers, and utilities
 */

export * from "./DataValidator";
export * from "./EntityValidators";
export * from "./ValidationLogger";

import {
  CellValidator,
  JobValidator,
  PartValidator,
  OperationValidator,
  TimeEntryValidator,
  QuantityRecordValidator,
  IssueValidator,
  OperationResourceValidator,
} from "./EntityValidators";

/**
 * Validator Factory
 * Get the appropriate validator for an entity type
 */
export class ValidatorFactory {
  static getValidator(entityType: string) {
    switch (entityType) {
      case "cells":
        return new CellValidator();
      case "jobs":
        return new JobValidator();
      case "parts":
        return new PartValidator();
      case "operations":
        return new OperationValidator();
      case "time_entries":
        return new TimeEntryValidator();
      case "quantity_records":
        return new QuantityRecordValidator();
      case "issues":
        return new IssueValidator();
      case "operation_resources":
        return new OperationResourceValidator();
      default:
        throw new Error(`No validator found for entity type: ${entityType}`);
    }
  }
}
