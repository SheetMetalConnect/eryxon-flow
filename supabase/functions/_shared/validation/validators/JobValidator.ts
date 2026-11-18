/**
 * Job Validator
 * Validates job creation/update including nested parts and operations
 */

import { BaseValidator } from "../BaseValidator.ts";
import { ValidationContext, ValidationError } from "../types.ts";

const JOB_STATUSES = ["not_started", "in_progress", "on_hold", "completed"];

export interface JobData {
  job_number: string;
  parts?: PartData[];
  current_cell_id?: string;
  status?: string;
  priority?: number;
  due_date?: string;
  customer_name?: string;
  description?: string;
  metadata?: any;
}

export interface PartData {
  part_number: string;
  quantity: number;
  operations: OperationData[];
  parent_part_id?: string;
  current_cell_id?: string;
  material_id?: string;
  description?: string;
  drawing_url?: string;
  step_file_url?: string;
}

export interface OperationData {
  operation_name: string;
  sequence: number;
  cell_id?: string;
  assigned_operator_id?: string;
  estimated_time_minutes?: number;
  setup_time_minutes?: number;
  instructions?: string;
  resources?: ResourceData[];
}

export interface ResourceData {
  resource_id: string;
  quantity?: number;
}

export class JobValidator extends BaseValidator<JobData> {
  constructor() {
    super("job");
  }

  validateEntity(
    entity: JobData,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required: job_number
    const jobNumberError = this.validateString(entity, "job_number", index, {
      required: true,
      minLength: 1,
      maxLength: 255,
    });
    if (jobNumberError) errors.push(jobNumberError);

    // Optional: current_cell_id
    const cellError = this.validateForeignKey(
      entity,
      "current_cell_id",
      context.validCellIds,
      index,
      false,
    );
    if (cellError) errors.push(cellError);

    // Optional: status (enum)
    const statusError = this.validateEnum(
      entity,
      "status",
      JOB_STATUSES,
      index,
      false,
    );
    if (statusError) errors.push(statusError);

    // Optional: priority (number >= 0)
    const priorityError = this.validateNumber(entity, "priority", index, {
      min: 0,
      required: false,
      integer: true,
    });
    if (priorityError) errors.push(priorityError);

    // Optional: due_date (valid date)
    const dueDateError = this.validateDate(entity, "due_date", index, false);
    if (dueDateError) errors.push(dueDateError);

    // Optional: customer_name
    const customerError = this.validateString(entity, "customer_name", index, {
      maxLength: 255,
      required: false,
    });
    if (customerError) errors.push(customerError);

    // Optional: description
    const descError = this.validateString(entity, "description", index, {
      required: false,
    });
    if (descError) errors.push(descError);

    // Required for creation: parts array
    if (entity.parts !== undefined) {
      const partsError = this.validateArray(entity, "parts", index, {
        minLength: 1,
        required: true,
      });
      if (partsError) {
        errors.push(partsError);
      } else {
        // Validate nested parts
        entity.parts.forEach((part, partIndex) => {
          const partErrors = this.validatePart(
            part,
            index,
            partIndex,
            context,
          );
          errors.push(...partErrors);
        });

        // Check for duplicate part numbers within job
        const partNumbers = entity.parts.map((p) => p.part_number);
        const duplicates = partNumbers.filter(
          (num, idx) => partNumbers.indexOf(num) !== idx,
        );
        if (duplicates.length > 0) {
          errors.push({
            field: "parts",
            message: `Duplicate part numbers found: ${[...new Set(duplicates)].join(", ")}`,
            constraint: "UNIQUE_CONSTRAINT",
            entityType: this.entityType,
            entityIndex: index,
          });
        }
      }
    }

    return errors;
  }

  private validatePart(
    part: PartData,
    jobIndex: number,
    partIndex: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const entityIndex = jobIndex;

    // Required: part_number
    if (!part.part_number || part.part_number.trim() === "") {
      errors.push({
        field: `parts[${partIndex}].part_number`,
        message: "Part number is required",
        constraint: "NOT_NULL",
        entityType: "part",
        entityIndex,
      });
    } else if (part.part_number.length > 255) {
      errors.push({
        field: `parts[${partIndex}].part_number`,
        message: "Part number must be at most 255 characters",
        constraint: "MAX_LENGTH",
        entityType: "part",
        entityIndex,
      });
    }

    // Required: quantity (number >= 1)
    if (
      part.quantity === null || part.quantity === undefined
    ) {
      errors.push({
        field: `parts[${partIndex}].quantity`,
        message: "Part quantity is required",
        constraint: "NOT_NULL",
        entityType: "part",
        entityIndex,
      });
    } else if (typeof part.quantity !== "number" || part.quantity < 1) {
      errors.push({
        field: `parts[${partIndex}].quantity`,
        message: "Part quantity must be >= 1",
        constraint: "MIN_VALUE",
        entityType: "part",
        entityIndex,
      });
    }

    // Optional: parent_part_id (FK)
    if (part.parent_part_id) {
      if (!this.isValidUUID(part.parent_part_id)) {
        errors.push({
          field: `parts[${partIndex}].parent_part_id`,
          message: "Invalid UUID format for parent_part_id",
          constraint: "UUID_FORMAT",
          entityType: "part",
          entityIndex,
        });
      } else if (
        context.validPartIds &&
        !context.validPartIds.includes(part.parent_part_id)
      ) {
        errors.push({
          field: `parts[${partIndex}].parent_part_id`,
          message: `Parent part ID references non-existent part: ${part.parent_part_id}`,
          constraint: "FK_CONSTRAINT",
          entityType: "part",
          entityIndex,
        });
      }
    }

    // Optional: current_cell_id (FK)
    if (part.current_cell_id) {
      if (!this.isValidUUID(part.current_cell_id)) {
        errors.push({
          field: `parts[${partIndex}].current_cell_id`,
          message: "Invalid UUID format for current_cell_id",
          constraint: "UUID_FORMAT",
          entityType: "part",
          entityIndex,
        });
      } else if (
        context.validCellIds &&
        !context.validCellIds.includes(part.current_cell_id)
      ) {
        errors.push({
          field: `parts[${partIndex}].current_cell_id`,
          message: `Cell ID references non-existent cell: ${part.current_cell_id}`,
          constraint: "FK_CONSTRAINT",
          entityType: "part",
          entityIndex,
        });
      }
    }

    // Optional: material_id (FK)
    if (part.material_id) {
      if (!this.isValidUUID(part.material_id)) {
        errors.push({
          field: `parts[${partIndex}].material_id`,
          message: "Invalid UUID format for material_id",
          constraint: "UUID_FORMAT",
          entityType: "part",
          entityIndex,
        });
      } else if (
        context.validMaterialIds &&
        !context.validMaterialIds.includes(part.material_id)
      ) {
        errors.push({
          field: `parts[${partIndex}].material_id`,
          message: `Material ID references non-existent material: ${part.material_id}`,
          constraint: "FK_CONSTRAINT",
          entityType: "part",
          entityIndex,
        });
      }
    }

    // Required: operations array (min 1)
    if (!part.operations || !Array.isArray(part.operations)) {
      errors.push({
        field: `parts[${partIndex}].operations`,
        message: "Operations array is required",
        constraint: "NOT_NULL",
        entityType: "part",
        entityIndex,
      });
    } else if (part.operations.length === 0) {
      errors.push({
        field: `parts[${partIndex}].operations`,
        message: "At least one operation is required per part",
        constraint: "MIN_LENGTH",
        entityType: "part",
        entityIndex,
      });
    } else {
      // Validate nested operations
      part.operations.forEach((operation, opIndex) => {
        const opErrors = this.validateOperation(
          operation,
          jobIndex,
          partIndex,
          opIndex,
          context,
        );
        errors.push(...opErrors);
      });

      // Check sequence numbers are unique and positive
      const sequences = part.operations.map((op) => op.sequence);
      const duplicateSeq = sequences.filter(
        (seq, idx) => sequences.indexOf(seq) !== idx,
      );
      if (duplicateSeq.length > 0) {
        errors.push({
          field: `parts[${partIndex}].operations`,
          message: `Duplicate sequence numbers found: ${[...new Set(duplicateSeq)].join(", ")}`,
          constraint: "UNIQUE_CONSTRAINT",
          entityType: "part",
          entityIndex,
        });
      }
    }

    return errors;
  }

  private validateOperation(
    operation: OperationData,
    jobIndex: number,
    partIndex: number,
    opIndex: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const entityIndex = jobIndex;

    // Required: operation_name
    if (!operation.operation_name || operation.operation_name.trim() === "") {
      errors.push({
        field: `parts[${partIndex}].operations[${opIndex}].operation_name`,
        message: "Operation name is required",
        constraint: "NOT_NULL",
        entityType: "operation",
        entityIndex,
      });
    }

    // Required: sequence (positive integer)
    if (
      operation.sequence === null || operation.sequence === undefined
    ) {
      errors.push({
        field: `parts[${partIndex}].operations[${opIndex}].sequence`,
        message: "Operation sequence is required",
        constraint: "NOT_NULL",
        entityType: "operation",
        entityIndex,
      });
    } else if (
      typeof operation.sequence !== "number" ||
      !Number.isInteger(operation.sequence) ||
      operation.sequence < 1
    ) {
      errors.push({
        field: `parts[${partIndex}].operations[${opIndex}].sequence`,
        message: "Operation sequence must be a positive integer",
        constraint: "MIN_VALUE",
        entityType: "operation",
        entityIndex,
      });
    }

    // Optional: cell_id (FK)
    if (operation.cell_id) {
      if (!this.isValidUUID(operation.cell_id)) {
        errors.push({
          field: `parts[${partIndex}].operations[${opIndex}].cell_id`,
          message: "Invalid UUID format for cell_id",
          constraint: "UUID_FORMAT",
          entityType: "operation",
          entityIndex,
        });
      } else if (
        context.validCellIds &&
        !context.validCellIds.includes(operation.cell_id)
      ) {
        errors.push({
          field: `parts[${partIndex}].operations[${opIndex}].cell_id`,
          message: `Cell ID references non-existent cell: ${operation.cell_id}`,
          constraint: "FK_CONSTRAINT",
          entityType: "operation",
          entityIndex,
        });
      }
    }

    // Optional: assigned_operator_id (FK)
    if (operation.assigned_operator_id) {
      if (!this.isValidUUID(operation.assigned_operator_id)) {
        errors.push({
          field:
            `parts[${partIndex}].operations[${opIndex}].assigned_operator_id`,
          message: "Invalid UUID format for assigned_operator_id",
          constraint: "UUID_FORMAT",
          entityType: "operation",
          entityIndex,
        });
      } else if (
        context.validOperatorIds &&
        !context.validOperatorIds.includes(operation.assigned_operator_id)
      ) {
        errors.push({
          field:
            `parts[${partIndex}].operations[${opIndex}].assigned_operator_id`,
          message:
            `Operator ID references non-existent operator: ${operation.assigned_operator_id}`,
          constraint: "FK_CONSTRAINT",
          entityType: "operation",
          entityIndex,
        });
      }
    }

    // Optional: estimated_time_minutes (>= 0)
    if (operation.estimated_time_minutes !== null && operation.estimated_time_minutes !== undefined) {
      if (
        typeof operation.estimated_time_minutes !== "number" ||
        operation.estimated_time_minutes < 0
      ) {
        errors.push({
          field:
            `parts[${partIndex}].operations[${opIndex}].estimated_time_minutes`,
          message: "Estimated time must be >= 0",
          constraint: "MIN_VALUE",
          entityType: "operation",
          entityIndex,
        });
      }
    }

    // Optional: setup_time_minutes (>= 0)
    if (operation.setup_time_minutes !== null && operation.setup_time_minutes !== undefined) {
      if (
        typeof operation.setup_time_minutes !== "number" ||
        operation.setup_time_minutes < 0
      ) {
        errors.push({
          field:
            `parts[${partIndex}].operations[${opIndex}].setup_time_minutes`,
          message: "Setup time must be >= 0",
          constraint: "MIN_VALUE",
          entityType: "operation",
          entityIndex,
        });
      }
    }

    // Optional: resources array
    if (operation.resources && Array.isArray(operation.resources)) {
      operation.resources.forEach((resource, resIndex) => {
        if (!resource.resource_id) {
          errors.push({
            field:
              `parts[${partIndex}].operations[${opIndex}].resources[${resIndex}].resource_id`,
            message: "Resource ID is required",
            constraint: "NOT_NULL",
            entityType: "operation",
            entityIndex,
          });
        } else if (!this.isValidUUID(resource.resource_id)) {
          errors.push({
            field:
              `parts[${partIndex}].operations[${opIndex}].resources[${resIndex}].resource_id`,
            message: "Invalid UUID format for resource_id",
            constraint: "UUID_FORMAT",
            entityType: "operation",
            entityIndex,
          });
        } else if (
          context.validResourceIds &&
          !context.validResourceIds.includes(resource.resource_id)
        ) {
          errors.push({
            field:
              `parts[${partIndex}].operations[${opIndex}].resources[${resIndex}].resource_id`,
            message:
              `Resource ID references non-existent resource: ${resource.resource_id}`,
            constraint: "FK_CONSTRAINT",
            entityType: "operation",
            entityIndex,
          });
        }
      });
    }

    return errors;
  }
}
