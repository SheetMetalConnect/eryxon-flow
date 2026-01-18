/**
 * Issue/NCR Validator
 * Validates issue and non-conformance report creation/update
 */

import { BaseValidator } from "../BaseValidator.ts";
import { ValidationContext, ValidationError } from "../types.ts";

const ISSUE_TYPES = ["general", "ncr"];
const ISSUE_STATUSES = ["open", "in_progress", "resolved", "closed"];
const ISSUE_SEVERITIES = ["low", "medium", "high", "critical"];
const NCR_CATEGORIES = [
  "material",
  "process",
  "equipment",
  "design",
  "supplier",
  "documentation",
  "other",
];
const NCR_DISPOSITIONS = [
  "use_as_is",
  "rework",
  "repair",
  "scrap",
  "return_to_supplier",
];

export interface IssueData {
  operation_id: string;
  title: string;
  description: string;
  issue_type?: string;
  severity?: string;
  status?: string;
  reported_by_id?: string;
  resolved_by_id?: string;
  verified_by_id?: string;
  ncr_number?: string;
  ncr_category?: string;
  ncr_disposition?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  resolution_notes?: string;
}

export class IssueValidator extends BaseValidator<IssueData> {
  constructor() {
    super("issue");
  }

  validateEntity(
    entity: IssueData,
    index: number,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required: operation_id
    const operationError = this.validateForeignKey(
      entity,
      "operation_id",
      context.validOperationIds,
      index,
      true,
    );
    if (operationError) errors.push(operationError);

    // Required: title
    const titleError = this.validateString(entity, "title", index, {
      required: true,
      minLength: 1,
      maxLength: 255,
    });
    if (titleError) errors.push(titleError);

    // Required: description
    const descError = this.validateString(entity, "description", index, {
      required: true,
      minLength: 1,
    });
    if (descError) errors.push(descError);

    // Optional: issue_type (enum)
    if (entity.issue_type !== undefined) {
      const typeError = this.validateEnum(
        entity,
        "issue_type",
        ISSUE_TYPES,
        index,
        false,
      );
      if (typeError) errors.push(typeError);
    }

    // Optional: severity (enum)
    if (entity.severity !== undefined) {
      const severityError = this.validateEnum(
        entity,
        "severity",
        ISSUE_SEVERITIES,
        index,
        false,
      );
      if (severityError) errors.push(severityError);
    }

    // Optional: status (enum)
    if (entity.status !== undefined) {
      const statusError = this.validateEnum(
        entity,
        "status",
        ISSUE_STATUSES,
        index,
        false,
      );
      if (statusError) errors.push(statusError);
    }

    // Optional: reported_by_id
    if (entity.reported_by_id !== undefined) {
      const reporterError = this.validateForeignKey(
        entity,
        "reported_by_id",
        context.validOperatorIds,
        index,
        false,
      );
      if (reporterError) errors.push(reporterError);
    }

    // Optional: resolved_by_id
    if (entity.resolved_by_id !== undefined) {
      const resolverError = this.validateForeignKey(
        entity,
        "resolved_by_id",
        context.validOperatorIds,
        index,
        false,
      );
      if (resolverError) errors.push(resolverError);
    }

    // Optional: verified_by_id
    if (entity.verified_by_id !== undefined) {
      const verifierError = this.validateForeignKey(
        entity,
        "verified_by_id",
        context.validOperatorIds,
        index,
        false,
      );
      if (verifierError) errors.push(verifierError);
    }

    // NCR-specific validation
    if (entity.issue_type === "ncr") {
      // NCR number validation
      if (entity.ncr_number !== undefined) {
        const ncrNumError = this.validateString(entity, "ncr_number", index, {
          required: false,
          maxLength: 50,
        });
        if (ncrNumError) errors.push(ncrNumError);
      }

      // NCR category validation
      if (entity.ncr_category !== undefined) {
        const categoryError = this.validateEnum(
          entity,
          "ncr_category",
          NCR_CATEGORIES,
          index,
          false,
        );
        if (categoryError) errors.push(categoryError);
      }

      // NCR disposition validation
      if (entity.ncr_disposition !== undefined) {
        const dispositionError = this.validateEnum(
          entity,
          "ncr_disposition",
          NCR_DISPOSITIONS,
          index,
          false,
        );
        if (dispositionError) errors.push(dispositionError);
      }
    }

    return errors;
  }
}
