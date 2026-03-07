/**
 * Entity-specific validators for MES data
 */

import {
  BaseValidator,
  ValidationContext,
  ValidationError,
} from "./DataValidator";

/**
 * Cell Validator
 */
export class CellValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("cells");
  }

  validateEntity(
    cell: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [
      ...this.validateRequiredFields(cell, ["tenant_id", "name"], index),
    ];

    // Numeric validations
    const sequenceError = this.validateNumber(cell, "sequence", index, { min: 0, required: false });
    if (sequenceError) errors.push(sequenceError);

    const wipLimitError = this.validateNumber(cell, "wip_limit", index, { min: 0, required: false });
    if (wipLimitError) errors.push(wipLimitError);

    return errors;
  }
}

/**
 * Job Validator
 */
export class JobValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("jobs");
  }

  validateEntity(
    job: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    return this.validateRequiredFields(job, ["tenant_id", "job_number"], index);
  }
}

/**
 * Part Validator
 */
export class PartValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("parts");
  }

  validateEntity(
    part: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [
      ...this.validateRequiredFields(part, ["tenant_id", "part_number"], index),
    ];

    // Foreign key: job_id (required)
    const jobFkError = this.validateForeignKey(
      part,
      "job_id",
      context.validJobIds,
      index,
      true,
    );
    if (jobFkError) errors.push(jobFkError);

    // Foreign key: parent_part_id (optional, self-referential)
    const parentFkError = this.validateForeignKey(
      part,
      "parent_part_id",
      context.validPartIds,
      index,
      false,
    );
    if (parentFkError) errors.push(parentFkError);

    // Numeric validation
    const quantityError = this.validateNumber(part, "quantity", index, {
      min: 0,
      required: false,
    });
    if (quantityError) errors.push(quantityError);

    return errors;
  }
}

/**
 * Operation Validator
 */
export class OperationValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("operations");
  }

  validateEntity(
    operation: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [
      ...this.validateRequiredFields(operation, ["tenant_id", "operation_name"], index),
    ];

    // Foreign key: part_id (required)
    const partFkError = this.validateForeignKey(
      operation,
      "part_id",
      context.validPartIds,
      index,
      true,
    );
    if (partFkError) errors.push(partFkError);

    // Foreign key: cell_id (required)
    const cellFkError = this.validateForeignKey(
      operation,
      "cell_id",
      context.validCellIds,
      index,
      true,
    );
    if (cellFkError) errors.push(cellFkError);

    // Numeric validations
    const sequenceError = this.validateNumber(operation, "sequence", index, {
      min: 0,
      required: false,
    });
    if (sequenceError) errors.push(sequenceError);

    const estimatedTimeError = this.validateNumber(
      operation,
      "estimated_time",
      index,
      { min: 0, required: false },
    );
    if (estimatedTimeError) errors.push(estimatedTimeError);

    return errors;
  }
}

/**
 * Time Entry Validator
 */
export class TimeEntryValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("time_entries");
  }

  validateEntity(
    timeEntry: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [
      ...this.validateRequiredFields(timeEntry, ["tenant_id"], index),
    ];

    // Foreign key: operation_id (required)
    const operationFkError = this.validateForeignKey(
      timeEntry,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    // Foreign key: operator_id (optional - can be null if no operators)
    const operatorFkError = this.validateForeignKey(
      timeEntry,
      "operator_id",
      context.validOperatorIds,
      index,
      false,
    );
    if (operatorFkError) errors.push(operatorFkError);

    // Numeric validations
    const durationError = this.validateNumber(timeEntry, "duration", index, {
      min: 0,
      required: false,
    });
    if (durationError) errors.push(durationError);

    return errors;
  }
}

/**
 * Quantity Record Validator
 */
export class QuantityRecordValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("quantity_records");
  }

  validateEntity(
    record: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [
      ...this.validateRequiredFields(record, ["tenant_id"], index),
    ];

    // Foreign key: operation_id (required)
    const operationFkError = this.validateForeignKey(
      record,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    // Foreign key: recorded_by (optional)
    const operatorFkError = this.validateForeignKey(
      record,
      "recorded_by",
      context.validOperatorIds,
      index,
      false,
    );
    if (operatorFkError) errors.push(operatorFkError);

    // Foreign key: scrap_reason_id (optional)
    const scrapReasonFkError = this.validateForeignKey(
      record,
      "scrap_reason_id",
      context.validScrapReasonIds,
      index,
      false,
    );
    if (scrapReasonFkError) errors.push(scrapReasonFkError);

    // Numeric validations
    const quantityProducedError = this.validateNumber(
      record,
      "quantity_produced",
      index,
      { min: 0, required: false },
    );
    if (quantityProducedError) errors.push(quantityProducedError);

    const quantityGoodError = this.validateNumber(
      record,
      "quantity_good",
      index,
      { min: 0, required: false },
    );
    if (quantityGoodError) errors.push(quantityGoodError);

    const quantityScrapError = this.validateNumber(
      record,
      "quantity_scrap",
      index,
      { min: 0, required: false },
    );
    if (quantityScrapError) errors.push(quantityScrapError);

    const quantityReworkError = this.validateNumber(
      record,
      "quantity_rework",
      index,
      { min: 0, required: false },
    );
    if (quantityReworkError) errors.push(quantityReworkError);

    return errors;
  }
}

/**
 * Issue/NCR Validator
 */
export class IssueValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("issues");
  }

  validateEntity(
    issue: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [
      ...this.validateRequiredFields(issue, ["tenant_id", "description"], index),
    ];

    // Foreign key: operation_id (required)
    const operationFkError = this.validateForeignKey(
      issue,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    // Foreign key: created_by (optional)
    const createdByFkError = this.validateForeignKey(
      issue,
      "created_by",
      context.validOperatorIds,
      index,
      false,
    );
    if (createdByFkError) errors.push(createdByFkError);

    // Foreign key: reviewed_by (optional)
    const reviewedByFkError = this.validateForeignKey(
      issue,
      "reviewed_by",
      context.validOperatorIds,
      index,
      false,
    );
    if (reviewedByFkError) errors.push(reviewedByFkError);

    return errors;
  }
}

/**
 * Operation Resource Link Validator
 */
export class OperationResourceValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("operation_resources");
  }

  validateEntity(
    link: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Foreign key: operation_id (required)
    const operationFkError = this.validateForeignKey(
      link,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    // Foreign key: resource_id (required)
    const resourceFkError = this.validateForeignKey(
      link,
      "resource_id",
      context.validResourceIds,
      index,
      true,
    );
    if (resourceFkError) errors.push(resourceFkError);

    // Numeric validation
    const quantityError = this.validateNumber(link, "quantity", index, {
      min: 0,
      required: false,
    });
    if (quantityError) errors.push(quantityError);

    return errors;
  }
}
