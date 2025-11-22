/**
 * Validation Logger
 *
 * Rich logging system with proper status codes and user-friendly messages
 */

import {
  ValidationResult,
  ValidationSeverity,
  ValidationError,
} from "./DataValidator";

export interface LogEntry {
  timestamp: string;
  severity: ValidationSeverity;
  httpStatus: number;
  message: string;
  details?: any;
  entityType?: string;
}

export class ValidationLogger {
  private logs: LogEntry[] = [];

  /**
   * Log a validation result
   */
  logValidation(result: ValidationResult, entityType: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      severity: result.severity,
      httpStatus: result.httpStatus,
      message: result.summary,
      details: {
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        errors: result.errors,
        warnings: result.warnings,
      },
      entityType,
    };

    this.logs.push(entry);

    // Console logging with colors
    this.consoleLog(entry, result);
  }

  /**
   * Console log with proper formatting and colors
   */
  private consoleLog(entry: LogEntry, result: ValidationResult): void {
    const prefix = this.getSeverityPrefix(entry.severity);
    const statusBadge = this.getStatusBadge(entry.httpStatus);

    if (result.valid) {
      console.log(
        `${prefix} ${statusBadge} ${entry.message}`,
      );
    } else {
      console.error(
        `${prefix} ${statusBadge} ${entry.message}`,
      );
      console.error(result.technicalDetails);
    }
  }

  /**
   * Get severity prefix for console
   */
  private getSeverityPrefix(severity: ValidationSeverity): string {
    switch (severity) {
      case ValidationSeverity.ERROR:
        return "❌ ERROR";
      case ValidationSeverity.WARNING:
        return "⚠️  WARNING";
      case ValidationSeverity.INFO:
        return "✓";
      default:
        return "ℹ️";
    }
  }

  /**
   * Get HTTP status badge
   */
  private getStatusBadge(httpStatus: number): string {
    if (httpStatus >= 200 && httpStatus < 300) {
      return `[${httpStatus} OK]`;
    } else if (httpStatus >= 400 && httpStatus < 500) {
      return `[${httpStatus} CLIENT ERROR]`;
    } else if (httpStatus >= 500) {
      return `[${httpStatus} SERVER ERROR]`;
    }
    return `[${httpStatus}]`;
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get summary of all validations
   */
  getSummary(): {
    totalValidations: number;
    passed: number;
    failed: number;
    warnings: number;
  } {
    return {
      totalValidations: this.logs.length,
      passed: this.logs.filter(
        (l) => l.severity === ValidationSeverity.INFO,
      ).length,
      failed: this.logs.filter(
        (l) => l.severity === ValidationSeverity.ERROR,
      ).length,
      warnings: this.logs.filter(
        (l) => l.severity === ValidationSeverity.WARNING,
      ).length,
    };
  }

  /**
   * Generate user-friendly toast message
   */
  getToastMessage(): { title: string; description: string; variant: "default" | "destructive" | "success" } {
    const summary = this.getSummary();

    if (summary.failed > 0) {
      return {
        title: "Validation Failed",
        description: `${summary.failed} validation error(s) found. Check console for details.`,
        variant: "destructive",
      };
    } else if (summary.warnings > 0) {
      return {
        title: "Validation Completed with Warnings",
        description: `${summary.passed} passed, ${summary.warnings} warning(s). Data created successfully.`,
        variant: "default",
      };
    } else {
      return {
        title: "Validation Successful",
        description: `All ${summary.totalValidations} validations passed successfully.`,
        variant: "success",
      };
    }
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
}

/**
 * API Response Formatter
 *
 * Format validation results for RESTful API responses
 */
export class APIResponseFormatter {
  /**
   * Format validation result as API response
   */
  static formatResponse(
    result: ValidationResult,
    operationType: "CREATE" | "UPDATE" | "DELETE" | "VALIDATE",
  ): {
    status: number;
    success: boolean;
    message: string;
    data?: any;
    errors?: any[];
    warnings?: any[];
  } {
    return {
      status: result.httpStatus,
      success: result.valid,
      message: result.summary,
      errors: result.errors.length > 0 ? result.errors : undefined,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      data:
        result.valid
          ? {
              operationType,
              validatedAt: new Date().toISOString(),
            }
          : undefined,
    };
  }

  /**
   * Format batch operation response
   */
  static formatBatchResponse(
    results: ValidationResult[],
    operationType: "CREATE" | "UPDATE" | "DELETE" | "VALIDATE",
  ): {
    status: number;
    success: boolean;
    message: string;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    results: any[];
  } {
    const successful = results.filter((r) => r.valid).length;
    const failed = results.filter((r) => !r.valid).length;
    const overallSuccess = failed === 0;

    return {
      status: overallSuccess ? 200 : 422,
      success: overallSuccess,
      message: overallSuccess
        ? `All ${results.length} validations passed`
        : `${failed} of ${results.length} validations failed`,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results: results.map((r, index) => ({
        index,
        valid: r.valid,
        httpStatus: r.httpStatus,
        summary: r.summary,
        errors: r.errors,
        warnings: r.warnings,
      })),
    };
  }
}
