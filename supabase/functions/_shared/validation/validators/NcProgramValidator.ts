import { BaseValidator } from "../BaseValidator.ts";
import type { ValidationError, ValidationContext } from "../types.ts";
import { fetchValidIds } from "../fkValidator.ts";

interface NcProgramInput {
  program_name?: string;
  part_id?: string;
  operation_id?: string;
  program_type?: string;
  status?: string;
  file_path?: string;
  version?: number;
  previous_version_id?: string;
}

const VALID_PROGRAM_TYPES = ["cnc", "laser", "plasma", "waterjet", "robot", "other"];
const VALID_STATUSES = ["draft", "active", "archived", "superseded"];

export class NcProgramValidator extends BaseValidator<NcProgramInput> {
  constructor() {
    super("nc_program");
  }

  override async validateEntity(
    entity: NcProgramInput,
    index: number,
    context: ValidationContext,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const requiredFields = ["program_name", "file_path", "program_type"] as const;
    for (const field of requiredFields) {
      const err = this.validateRequired(entity, field, index);
      if (err) errors.push(err);
    }

    const stringOpts = { minLength: 1, maxLength: 255 };
    const programNameErr = this.validateString(entity, "program_name", index, {
      ...stringOpts,
      required: true,
    });
    if (programNameErr) errors.push(programNameErr);

    const filePathErr = this.validateString(entity, "file_path", index, {
      ...stringOpts,
      required: true,
    });
    if (filePathErr) errors.push(filePathErr);

    if (entity.program_type) {
      const typeErr = this.validateEnum(entity, "program_type", VALID_PROGRAM_TYPES, index);
      if (typeErr) errors.push(typeErr);
    }

    if (entity.status) {
      const statusErr = this.validateEnum(entity, "status", VALID_STATUSES, index);
      if (statusErr) errors.push(statusErr);
    }

    const versionErr = this.validateNumber(entity, "version", index, {
      integer: true,
      min: 1,
    });
    if (versionErr && entity.version !== undefined) errors.push(versionErr);

    if (entity.part_id) {
      const validPartIds = await fetchValidIds(context.supabase, "parts", [entity.part_id]);
      const fkErr = this.validateForeignKey(entity, "part_id", validPartIds, index);
      if (fkErr) errors.push(fkErr);
    }

    if (entity.operation_id) {
      const validOpIds = await fetchValidIds(context.supabase, "operations", [entity.operation_id]);
      const fkErr = this.validateForeignKey(entity, "operation_id", validOpIds, index);
      if (fkErr) errors.push(fkErr);
    }

    if (entity.previous_version_id) {
      const validNcIds = await fetchValidIds(context.supabase, "nc_programs", [entity.previous_version_id]);
      const fkErr = this.validateForeignKey(entity, "previous_version_id", validNcIds, index);
      if (fkErr) errors.push(fkErr);
    }

    return errors;
  }
}
