/**
 * Operation Validator
 * Validates operation creation/update
 */

import { BaseValidator } from "../BaseValidator.ts";
import { ValidationContext, ValidationError } from "../types.ts";

const OPERATION_STATUSES = [
  "not_started",
  "in_progress",
  "paused",
  "completed",
];

export interface OperationUpdateData {
  part_id?: string;
  operation_name?: string;
  sequence?: number;
  cell_id?: string;
  assigned_operator_id?: string;
  status?: string;
  estimated_time_minutes?: number;
  setup_time_minutes?: number;
  actual_time_minutes?: number;
  instructions?: string;
  notes?: string;
}

export class OperationValidator extends BaseValidator<OperationUpdateData> {
  constructor() {
    super("operation");
  }

  validateEntity(
    entity: OperationUpdateData,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // part_id (required for creation)
    if (entity.part_id !== undefined) {
      const partError = this.validateForeignKey(
        entity,
        "part_id",
        context.validPartIds,
        index,
        true,
      );
      if (partError) errors.push(partError);
    }

    // operation_name
    if (entity.operation_name !== undefined) {
      const nameError = this.validateString(entity, "operation_name", index, {
        required: false,
        minLength: 1,
        maxLength: 255,
      });
      if (nameError) errors.push(nameError);
    }

    // sequence
    if (entity.sequence !== undefined) {
      const seqError = this.validateNumber(entity, "sequence", index, {
        min: 1,
        required: false,
        integer: true,
      });
      if (seqError) errors.push(seqError);
    }

    // cell_id
    if (entity.cell_id !== undefined) {
      const cellError = this.validateForeignKey(
        entity,
        "cell_id",
        context.validCellIds,
        index,
        false,
      );
      if (cellError) errors.push(cellError);
    }

    // assigned_operator_id
    if (entity.assigned_operator_id !== undefined) {
      const operatorError = this.validateForeignKey(
        entity,
        "assigned_operator_id",
        context.validOperatorIds,
        index,
        false,
      );
      if (operatorError) errors.push(operatorError);
    }

    // status
    if (entity.status !== undefined) {
      const statusError = this.validateEnum(
        entity,
        "status",
        OPERATION_STATUSES,
        index,
        false,
      );
      if (statusError) errors.push(statusError);
    }

    // estimated_time_minutes
    if (entity.estimated_time_minutes !== undefined) {
      const estTimeError = this.validateNumber(
        entity,
        "estimated_time_minutes",
        index,
        {
          min: 0,
          required: false,
        },
      );
      if (estTimeError) errors.push(estTimeError);
    }

    // setup_time_minutes
    if (entity.setup_time_minutes !== undefined) {
      const setupTimeError = this.validateNumber(
        entity,
        "setup_time_minutes",
        index,
        {
          min: 0,
          required: false,
        },
      );
      if (setupTimeError) errors.push(setupTimeError);
    }

    // actual_time_minutes
    if (entity.actual_time_minutes !== undefined) {
      const actualTimeError = this.validateNumber(
        entity,
        "actual_time_minutes",
        index,
        {
          min: 0,
          required: false,
        },
      );
      if (actualTimeError) errors.push(actualTimeError);
    }

    return errors;
  }
}
