/**
 * Error handling tests
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  AppError,
  validationError,
  notFoundError,
  databaseError,
  invalidStateTransition,
  wrapError,
} from './errors.js';

describe('error handling', () => {
  describe('AppError', () => {
    it('creates error with required fields', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.severity).toBe('error');
      expect(error.timestamp).toBeDefined();
    });

    it('creates error with custom severity', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Minor issue', {
        severity: 'warning',
      });
      expect(error.severity).toBe('warning');
    });

    it('includes context when provided', () => {
      const error = new AppError(ErrorCode.NOT_FOUND, 'Job not found', {
        context: { jobId: '123', user: 'test@example.com' },
      });
      expect(error.context).toEqual({ jobId: '123', user: 'test@example.com' });
    });

    it('preserves original error', () => {
      const originalError = new Error('Database connection failed');
      const error = new AppError(ErrorCode.DATABASE_ERROR, 'Failed to query', {
        originalError,
      });
      expect(error.originalError).toBe(originalError);
    });

    it('serializes to JSON correctly', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid', {
        context: { field: 'email' },
      });
      const json = error.toJSON();

      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(json.message).toBe('Invalid');
      expect(json.context).toEqual({ field: 'email' });
      expect(json.severity).toBe('error');
      expect(json.timestamp).toBeDefined();
    });

    it('includes original error in JSON', () => {
      const originalError = new Error('Original');
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Wrapped', {
        originalError,
      });
      const json = error.toJSON();

      expect(json.originalError).toEqual({
        name: 'Error',
        message: 'Original',
      });
    });
  });

  describe('helper functions', () => {
    it('validationError creates correct error', () => {
      const error = validationError('Field is required', { field: 'email' });
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Field is required');
      expect(error.context).toEqual({ field: 'email' });
    });

    it('notFoundError creates correct error', () => {
      const error = notFoundError('job', '123');
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('job not found: 123');
      expect(error.context).toEqual({ resource: 'job', id: '123' });
    });

    it('notFoundError works without id', () => {
      const error = notFoundError('user');
      expect(error.message).toBe('user not found');
    });

    it('databaseError preserves original error', () => {
      const original = new Error('Connection timeout');
      const error = databaseError('Query failed', original);
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.originalError).toBe(original);
    });

    it('invalidStateTransition includes context', () => {
      const error = invalidStateTransition('job', 'completed', 'in_progress');
      expect(error.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
      expect(error.message).toContain('completed');
      expect(error.message).toContain('in_progress');
      expect(error.context).toEqual({
        resource: 'job',
        currentState: 'completed',
        attemptedState: 'in_progress',
      });
    });

    it('wrapError preserves AppError', () => {
      const original = new AppError(ErrorCode.NOT_FOUND, 'Not found');
      const wrapped = wrapError(original);
      expect(wrapped).toBe(original);
    });

    it('wrapError converts standard Error', () => {
      const original = new Error('Something failed');
      const wrapped = wrapError(original);
      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(wrapped.message).toBe('Something failed');
      expect(wrapped.originalError).toBe(original);
    });

    it('wrapError converts unknown values', () => {
      const wrapped = wrapError('string error');
      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.message).toBe('string error');
    });
  });

  describe('ErrorCode enum', () => {
    it('has all expected error codes', () => {
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCode.QUERY_TIMEOUT).toBe('QUERY_TIMEOUT');
      expect(ErrorCode.INVALID_STATE_TRANSITION).toBe('INVALID_STATE_TRANSITION');
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });
});
