/**
 * Data Validation System - Types
 * Ported from src/lib/validation/DataValidator.ts for Edge Functions
 */

export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  httpStatus: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: string;
  technicalDetails: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint: string;
  entityType: string;
  entityIndex?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationContext {
  // Available IDs for FK validation
  validJobIds?: string[];
  validPartIds?: string[];
  validCellIds?: string[];
  validOperationIds?: string[];
  validOperatorIds?: string[];
  validResourceIds?: string[];
  validScrapReasonIds?: string[];
  validMaterialIds?: string[];
  validIntegrationIds?: string[];
  validWebhookIds?: string[];
  tenantId: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
    statusCode: number;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
