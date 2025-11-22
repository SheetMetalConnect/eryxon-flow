/**
 * Part Validator
 * Validates standalone part creation/update
 */

import { BaseValidator } from "../BaseValidator.ts";
import { ValidationContext, ValidationError } from "../types.ts";

export interface PartUpdateData {
  part_number?: string;
  quantity?: number;
  parent_part_id?: string;
  current_cell_id?: string;
  material_id?: string;
  description?: string;
  drawing_url?: string;
  step_file_url?: string;
  job_id?: string;
}

export class PartValidator extends BaseValidator<PartUpdateData> {
  constructor() {
    super("part");
  }

  validateEntity(
    entity: PartUpdateData,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // job_id (required for creation, optional for update)
    if (entity.job_id !== undefined) {
      const jobError = this.validateForeignKey(
        entity,
        "job_id",
        context.validJobIds,
        index,
        true,
      );
      if (jobError) errors.push(jobError);
    }

    // part_number
    if (entity.part_number !== undefined) {
      const partNumberError = this.validateString(entity, "part_number", index, {
        required: false,
        minLength: 1,
        maxLength: 255,
      });
      if (partNumberError) errors.push(partNumberError);
    }

    // quantity
    if (entity.quantity !== undefined) {
      const quantityError = this.validateNumber(entity, "quantity", index, {
        min: 1,
        required: false,
        integer: true,
      });
      if (quantityError) errors.push(quantityError);
    }

    // parent_part_id
    if (entity.parent_part_id !== undefined) {
      const parentError = this.validateForeignKey(
        entity,
        "parent_part_id",
        context.validPartIds,
        index,
        false,
      );
      if (parentError) errors.push(parentError);
    }

    // current_cell_id
    if (entity.current_cell_id !== undefined) {
      const cellError = this.validateForeignKey(
        entity,
        "current_cell_id",
        context.validCellIds,
        index,
        false,
      );
      if (cellError) errors.push(cellError);
    }

    // material_id
    if (entity.material_id !== undefined) {
      const materialError = this.validateForeignKey(
        entity,
        "material_id",
        context.validMaterialIds,
        index,
        false,
      );
      if (materialError) errors.push(materialError);
    }

    // description
    if (entity.description !== undefined) {
      const descError = this.validateString(entity, "description", index, {
        required: false,
      });
      if (descError) errors.push(descError);
    }

    // drawing_url
    if (entity.drawing_url !== undefined) {
      const drawingError = this.validateString(entity, "drawing_url", index, {
        required: false,
      });
      if (drawingError) errors.push(drawingError);
    }

    // step_file_url
    if (entity.step_file_url !== undefined) {
      const stepError = this.validateString(entity, "step_file_url", index, {
        required: false,
      });
      if (stepError) errors.push(stepError);
    }

    return errors;
  }
}
