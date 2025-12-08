import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationLogger, APIResponseFormatter } from './ValidationLogger';
import { ValidationSeverity, ValidationResult } from './DataValidator';

describe('ValidationLogger', () => {
  let logger: ValidationLogger;
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };

  beforeEach(() => {
    logger = new ValidationLogger();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('logValidation', () => {
    it('logs successful validation', () => {
      const result: ValidationResult = {
        valid: true,
        severity: ValidationSeverity.INFO,
        httpStatus: 200,
        errors: [],
        warnings: [],
        summary: '5 jobs validated successfully',
        technicalDetails: 'Validated 5 job records with no errors',
      };

      logger.logValidation(result, 'jobs');

      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logger.getLogs()).toHaveLength(1);
      expect(logger.getLogs()[0].entityType).toBe('jobs');
    });

    it('logs failed validation', () => {
      const result: ValidationResult = {
        valid: false,
        severity: ValidationSeverity.ERROR,
        httpStatus: 422,
        errors: [
          {
            field: 'name',
            message: 'Missing required field: name',
            constraint: 'NOT_NULL',
            entityType: 'jobs',
            entityIndex: 0,
          },
        ],
        warnings: [],
        summary: '1 validation error(s) in jobs',
        technicalDetails: 'Found 1 validation errors across 1 job records',
      };

      logger.logValidation(result, 'jobs');

      expect(consoleSpy.error).toHaveBeenCalled();
      expect(logger.getLogs()).toHaveLength(1);
      expect(logger.getLogs()[0].severity).toBe(ValidationSeverity.ERROR);
    });

    it('stores log entry with correct structure', () => {
      const result: ValidationResult = {
        valid: true,
        severity: ValidationSeverity.INFO,
        httpStatus: 200,
        errors: [],
        warnings: [],
        summary: 'Test summary',
        technicalDetails: 'Test details',
      };

      logger.logValidation(result, 'test_entity');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        severity: ValidationSeverity.INFO,
        httpStatus: 200,
        message: 'Test summary',
        entityType: 'test_entity',
      });
      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].details).toMatchObject({
        valid: true,
        errorCount: 0,
        warningCount: 0,
      });
    });
  });

  describe('getSummary', () => {
    it('returns correct summary with no validations', () => {
      const summary = logger.getSummary();
      expect(summary).toEqual({
        totalValidations: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      });
    });

    it('returns correct summary after multiple validations', () => {
      // Add successful validation
      logger.logValidation(
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Success',
          technicalDetails: '',
        },
        'jobs'
      );

      // Add failed validation
      logger.logValidation(
        {
          valid: false,
          severity: ValidationSeverity.ERROR,
          httpStatus: 422,
          errors: [{ field: 'test', message: 'Error', constraint: 'TEST', entityType: 'parts' }],
          warnings: [],
          summary: 'Failed',
          technicalDetails: '',
        },
        'parts'
      );

      // Add warning validation
      logger.logValidation(
        {
          valid: true,
          severity: ValidationSeverity.WARNING,
          httpStatus: 200,
          errors: [],
          warnings: [{ field: 'test', message: 'Warning' }],
          summary: 'Warning',
          technicalDetails: '',
        },
        'operations'
      );

      const summary = logger.getSummary();
      expect(summary.totalValidations).toBe(3);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.warnings).toBe(1);
    });
  });

  describe('getToastMessage', () => {
    it('returns success message when all validations pass', () => {
      logger.logValidation(
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Success',
          technicalDetails: '',
        },
        'jobs'
      );

      const toast = logger.getToastMessage();
      expect(toast.title).toBe('Validation Successful');
      expect(toast.variant).toBe('success');
    });

    it('returns destructive message when validations fail', () => {
      logger.logValidation(
        {
          valid: false,
          severity: ValidationSeverity.ERROR,
          httpStatus: 422,
          errors: [{ field: 'test', message: 'Error', constraint: 'TEST', entityType: 'jobs' }],
          warnings: [],
          summary: 'Failed',
          technicalDetails: '',
        },
        'jobs'
      );

      const toast = logger.getToastMessage();
      expect(toast.title).toBe('Validation Failed');
      expect(toast.variant).toBe('destructive');
      expect(toast.description).toContain('1 validation error');
    });

    it('returns default message with warnings', () => {
      logger.logValidation(
        {
          valid: true,
          severity: ValidationSeverity.WARNING,
          httpStatus: 200,
          errors: [],
          warnings: [{ field: 'test', message: 'Warning' }],
          summary: 'Warning',
          technicalDetails: '',
        },
        'jobs'
      );

      const toast = logger.getToastMessage();
      expect(toast.title).toBe('Validation Completed with Warnings');
      expect(toast.variant).toBe('default');
    });
  });

  describe('clear', () => {
    it('clears all logs', () => {
      logger.logValidation(
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Test',
          technicalDetails: '',
        },
        'jobs'
      );

      expect(logger.getLogs()).toHaveLength(1);

      logger.clear();

      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('getLogs', () => {
    it('returns a copy of logs', () => {
      logger.logValidation(
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Test',
          technicalDetails: '',
        },
        'jobs'
      );

      const logs = logger.getLogs();
      logs.push({} as any); // Modify returned array

      expect(logger.getLogs()).toHaveLength(1); // Original unchanged
    });
  });
});

describe('APIResponseFormatter', () => {
  describe('formatResponse', () => {
    it('formats successful validation response', () => {
      const result: ValidationResult = {
        valid: true,
        severity: ValidationSeverity.INFO,
        httpStatus: 200,
        errors: [],
        warnings: [],
        summary: 'Validation successful',
        technicalDetails: '',
      };

      const response = APIResponseFormatter.formatResponse(result, 'CREATE');

      expect(response).toMatchObject({
        status: 200,
        success: true,
        message: 'Validation successful',
      });
      expect(response.data).toBeDefined();
      expect(response.data.operationType).toBe('CREATE');
      expect(response.data.validatedAt).toBeDefined();
      expect(response.errors).toBeUndefined();
    });

    it('formats failed validation response', () => {
      const result: ValidationResult = {
        valid: false,
        severity: ValidationSeverity.ERROR,
        httpStatus: 422,
        errors: [
          { field: 'name', message: 'Missing', constraint: 'NOT_NULL', entityType: 'jobs' },
        ],
        warnings: [],
        summary: 'Validation failed',
        technicalDetails: '',
      };

      const response = APIResponseFormatter.formatResponse(result, 'UPDATE');

      expect(response).toMatchObject({
        status: 422,
        success: false,
        message: 'Validation failed',
      });
      expect(response.errors).toHaveLength(1);
      expect(response.data).toBeUndefined();
    });

    it('includes warnings when present', () => {
      const result: ValidationResult = {
        valid: true,
        severity: ValidationSeverity.WARNING,
        httpStatus: 200,
        errors: [],
        warnings: [{ field: 'optional', message: 'Consider adding this field' }],
        summary: 'Validation with warnings',
        technicalDetails: '',
      };

      const response = APIResponseFormatter.formatResponse(result, 'VALIDATE');

      expect(response.warnings).toHaveLength(1);
    });
  });

  describe('formatBatchResponse', () => {
    it('formats batch response with all successes', () => {
      const results: ValidationResult[] = [
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Success 1',
          technicalDetails: '',
        },
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Success 2',
          technicalDetails: '',
        },
      ];

      const response = APIResponseFormatter.formatBatchResponse(results, 'CREATE');

      expect(response).toMatchObject({
        status: 200,
        success: true,
        message: 'All 2 validations passed',
        summary: {
          total: 2,
          successful: 2,
          failed: 0,
        },
      });
      expect(response.results).toHaveLength(2);
    });

    it('formats batch response with failures', () => {
      const results: ValidationResult[] = [
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Success',
          technicalDetails: '',
        },
        {
          valid: false,
          severity: ValidationSeverity.ERROR,
          httpStatus: 422,
          errors: [{ field: 'name', message: 'Missing', constraint: 'NOT_NULL', entityType: 'jobs' }],
          warnings: [],
          summary: 'Failed',
          technicalDetails: '',
        },
      ];

      const response = APIResponseFormatter.formatBatchResponse(results, 'UPDATE');

      expect(response).toMatchObject({
        status: 422,
        success: false,
        summary: {
          total: 2,
          successful: 1,
          failed: 1,
        },
      });
      expect(response.message).toContain('1 of 2 validations failed');
    });

    it('includes index in results', () => {
      const results: ValidationResult[] = [
        {
          valid: true,
          severity: ValidationSeverity.INFO,
          httpStatus: 200,
          errors: [],
          warnings: [],
          summary: 'Success',
          technicalDetails: '',
        },
      ];

      const response = APIResponseFormatter.formatBatchResponse(results, 'DELETE');

      expect(response.results[0].index).toBe(0);
      expect(response.results[0].valid).toBe(true);
    });
  });
});
