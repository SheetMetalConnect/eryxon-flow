import {
  BaseValidator,
  ValidationContext,
  ValidationError,
} from "./DataValidator";

export class CellValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("cells");
  }

  validateEntity(
    cell: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const requiredError = this.validateRequired(cell, "tenant_id", index);
    if (requiredError) errors.push(requiredError);

    const nameError = this.validateRequired(cell, "name", index);
    if (nameError) errors.push(nameError);

    const sequenceError = this.validateNumber(cell, "sequence", index, {
      min: 0,
      required: false,
    });
    if (sequenceError) errors.push(sequenceError);

    const wipLimitError = this.validateNumber(cell, "wip_limit", index, {
      min: 0,
      required: false,
    });
    if (wipLimitError) errors.push(wipLimitError);

    return errors;
  }
}

export class JobValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("jobs");
  }

  validateEntity(
    job: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const tenantError = this.validateRequired(job, "tenant_id", index);
    if (tenantError) errors.push(tenantError);

    const jobNumberError = this.validateRequired(job, "job_number", index);
    if (jobNumberError) errors.push(jobNumberError);

    return errors;
  }
}

export class PartValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("parts");
  }

  validateEntity(
    part: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const tenantError = this.validateRequired(part, "tenant_id", index);
    if (tenantError) errors.push(tenantError);

    const partNumberError = this.validateRequired(part, "part_number", index);
    if (partNumberError) errors.push(partNumberError);

    const jobFkError = this.validateForeignKey(
      part,
      "job_id",
      context.validJobIds,
      index,
      true,
    );
    if (jobFkError) errors.push(jobFkError);

    const parentFkError = this.validateForeignKey(
      part,
      "parent_part_id",
      context.validPartIds,
      index,
      false,
    );
    if (parentFkError) errors.push(parentFkError);

    const quantityError = this.validateNumber(part, "quantity", index, {
      min: 0,
      required: false,
    });
    if (quantityError) errors.push(quantityError);

    return errors;
  }
}

export class OperationValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("operations");
  }

  validateEntity(
    operation: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const tenantError = this.validateRequired(operation, "tenant_id", index);
    if (tenantError) errors.push(tenantError);

    const operationNameError = this.validateRequired(
      operation,
      "operation_name",
      index,
    );
    if (operationNameError) errors.push(operationNameError);

    const partFkError = this.validateForeignKey(
      operation,
      "part_id",
      context.validPartIds,
      index,
      true,
    );
    if (partFkError) errors.push(partFkError);

    const cellFkError = this.validateForeignKey(
      operation,
      "cell_id",
      context.validCellIds,
      index,
      true,
    );
    if (cellFkError) errors.push(cellFkError);

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

export class TimeEntryValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("time_entries");
  }

  validateEntity(
    timeEntry: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const tenantError = this.validateRequired(timeEntry, "tenant_id", index);
    if (tenantError) errors.push(tenantError);

    const operationFkError = this.validateForeignKey(
      timeEntry,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    const operatorFkError = this.validateForeignKey(
      timeEntry,
      "operator_id",
      context.validOperatorIds,
      index,
      false,
    );
    if (operatorFkError) errors.push(operatorFkError);

    const durationError = this.validateNumber(timeEntry, "duration", index, {
      min: 0,
      required: false,
    });
    if (durationError) errors.push(durationError);

    return errors;
  }
}

export class QuantityRecordValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("quantity_records");
  }

  validateEntity(
    record: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const tenantError = this.validateRequired(record, "tenant_id", index);
    if (tenantError) errors.push(tenantError);

    const operationFkError = this.validateForeignKey(
      record,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    const operatorFkError = this.validateForeignKey(
      record,
      "recorded_by",
      context.validOperatorIds,
      index,
      false,
    );
    if (operatorFkError) errors.push(operatorFkError);

    const scrapReasonFkError = this.validateForeignKey(
      record,
      "scrap_reason_id",
      context.validScrapReasonIds,
      index,
      false,
    );
    if (scrapReasonFkError) errors.push(scrapReasonFkError);

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

export class IssueValidator extends BaseValidator<Record<string, unknown>> {
  constructor() {
    super("issues");
  }

  validateEntity(
    issue: Record<string, unknown>,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const tenantError = this.validateRequired(issue, "tenant_id", index);
    if (tenantError) errors.push(tenantError);

    const descriptionError = this.validateRequired(
      issue,
      "description",
      index,
    );
    if (descriptionError) errors.push(descriptionError);

    const operationFkError = this.validateForeignKey(
      issue,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    const createdByFkError = this.validateForeignKey(
      issue,
      "created_by",
      context.validOperatorIds,
      index,
      false,
    );
    if (createdByFkError) errors.push(createdByFkError);

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

    const operationFkError = this.validateForeignKey(
      link,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationFkError) errors.push(operationFkError);

    const resourceFkError = this.validateForeignKey(
      link,
      "resource_id",
      context.validResourceIds,
      index,
      true,
    );
    if (resourceFkError) errors.push(resourceFkError);

    const quantityError = this.validateNumber(link, "quantity", index, {
      min: 0,
      required: false,
    });
    if (quantityError) errors.push(quantityError);

    return errors;
  }
}
