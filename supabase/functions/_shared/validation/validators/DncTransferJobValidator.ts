import { BaseValidator } from "../BaseValidator.ts";
import type { ValidationError, ValidationContext } from "../types.ts";
import { fetchValidIds } from "../fkValidator.ts";

interface DncTransferInput {
  nc_program_id?: string;
  target_machine_id?: string;
  target_cell_id?: string;
  operation_id?: string;
  status?: string;
  transfer_protocol?: string;
  retry_count?: number;
  max_retries?: number;
}

const VALID_STATUSES = ["pending", "transferring", "completed", "failed", "cancelled"];
const VALID_PROTOCOLS = ["ftp", "smb", "mqtt", "api", "manual"];

export class DncTransferJobValidator extends BaseValidator<DncTransferInput> {
  constructor() {
    super("dnc_transfer_job");
  }

  override async validateEntity(
    entity: DncTransferInput,
    index: number,
    context: ValidationContext,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const ncRequired = this.validateRequired(entity, "nc_program_id", index);
    if (ncRequired) errors.push(ncRequired);

    if (entity.nc_program_id) {
      const validNcIds = await fetchValidIds(context.supabase, "nc_programs", [entity.nc_program_id]);
      const fkErr = this.validateForeignKey(entity, "nc_program_id", validNcIds, index);
      if (fkErr) errors.push(fkErr);
    }

    if (entity.target_machine_id) {
      const validResIds = await fetchValidIds(context.supabase, "resources", [entity.target_machine_id]);
      const fkErr = this.validateForeignKey(entity, "target_machine_id", validResIds, index);
      if (fkErr) errors.push(fkErr);
    }

    if (entity.target_cell_id) {
      const validCellIds = await fetchValidIds(context.supabase, "cells", [entity.target_cell_id]);
      const fkErr = this.validateForeignKey(entity, "target_cell_id", validCellIds, index);
      if (fkErr) errors.push(fkErr);
    }

    if (entity.operation_id) {
      const validOpIds = await fetchValidIds(context.supabase, "operations", [entity.operation_id]);
      const fkErr = this.validateForeignKey(entity, "operation_id", validOpIds, index);
      if (fkErr) errors.push(fkErr);
    }

    if (entity.status) {
      const statusErr = this.validateEnum(entity, "status", VALID_STATUSES, index);
      if (statusErr) errors.push(statusErr);
    }

    if (entity.transfer_protocol) {
      const protoErr = this.validateEnum(entity, "transfer_protocol", VALID_PROTOCOLS, index);
      if (protoErr) errors.push(protoErr);
    }

    const retryErr = this.validateNumber(entity, "retry_count", index, {
      integer: true,
      min: 0,
    });
    if (retryErr && entity.retry_count !== undefined) errors.push(retryErr);

    const maxRetryErr = this.validateNumber(entity, "max_retries", index, {
      integer: true,
      min: 0,
      max: 10,
    });
    if (maxRetryErr && entity.max_retries !== undefined) errors.push(maxRetryErr);

    if (entity.nc_program_id && !entity.target_machine_id && !entity.target_cell_id) {
      errors.push({
        field: "target_machine_id",
        message: "Either target_machine_id or target_cell_id is required",
        value: undefined,
        constraint: "REQUIRED_ONE",
        entityType: this.entityType,
        entityIndex: index,
      });
    }

    return errors;
  }
}
