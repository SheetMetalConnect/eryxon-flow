/**
 * Validation utilities tests
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateArgs, safeValidateArgs, schemas, toolSchemas } from './validation.js';

describe('validation utilities', () => {
  describe('schemas', () => {
    it('validates UUIDs correctly', () => {
      expect(() => schemas.id.parse('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
      expect(() => schemas.id.parse('invalid-uuid')).toThrow();
      expect(() => schemas.id.parse('')).toThrow();
    });

    it('validates limits with defaults', () => {
      expect(schemas.limit.parse(undefined)).toBe(50);
      expect(schemas.limit.parse(10)).toBe(10);
      expect(schemas.limit.parse(1000)).toBe(1000);
      expect(() => schemas.limit.parse(0)).toThrow();
      expect(() => schemas.limit.parse(1001)).toThrow();
      expect(() => schemas.limit.parse(-1)).toThrow();
    });

    it('validates offsets with defaults', () => {
      expect(schemas.offset.parse(undefined)).toBe(0);
      expect(schemas.offset.parse(100)).toBe(100);
      expect(() => schemas.offset.parse(-1)).toThrow();
    });

    it('validates job status enum', () => {
      expect(() => schemas.jobStatus.parse('in_progress')).not.toThrow();
      expect(() => schemas.jobStatus.parse('completed')).not.toThrow();
      expect(() => schemas.jobStatus.parse('invalid_status')).toThrow();
    });

    it('validates issue severity enum', () => {
      expect(() => schemas.issueSeverity.parse('high')).not.toThrow();
      expect(() => schemas.issueSeverity.parse('critical')).not.toThrow();
      expect(() => schemas.issueSeverity.parse('medium_high')).toThrow();
    });
  });

  describe('validateArgs', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().min(0),
    });

    it('validates correct input', () => {
      const result = validateArgs({ name: 'John', age: 30 }, testSchema);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('throws on missing required field', () => {
      expect(() => validateArgs({ name: 'John' }, testSchema)).toThrow('Validation failed');
      expect(() => validateArgs({ name: 'John' }, testSchema)).toThrow('age');
    });

    it('throws on invalid type', () => {
      expect(() => validateArgs({ name: 'John', age: 'thirty' }, testSchema)).toThrow('Validation failed');
    });

    it('throws on validation constraint violation', () => {
      expect(() => validateArgs({ name: '', age: 30 }, testSchema)).toThrow('Too small');
      expect(() => validateArgs({ name: 'John', age: -5 }, testSchema)).toThrow('>=0');
    });

    it('includes field path in error message', () => {
      try {
        validateArgs({ name: 'John' }, testSchema);
      } catch (error: any) {
        expect(error.message).toContain('age');
      }
    });
  });

  describe('safeValidateArgs', () => {
    const testSchema = z.object({
      email: z.string().email(),
    });

    it('returns success for valid input', () => {
      const result = safeValidateArgs({ email: 'test@example.com' }, testSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ email: 'test@example.com' });
      }
    });

    it('returns error for invalid input', () => {
      const result = safeValidateArgs({ email: 'not-an-email' }, testSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('email');
      }
    });

    it('does not throw on invalid input', () => {
      expect(() => safeValidateArgs({ email: 'invalid' }, testSchema)).not.toThrow();
    });
  });

  describe('toolSchemas', () => {
    it('fetchJobs schema validates correctly', () => {
      const valid = {
        status: 'in_progress' as const,
        limit: 25,
        offset: 0,
      };
      expect(() => validateArgs(valid, toolSchemas.fetchJobs)).not.toThrow();

      const withDefaults = {};
      const result = validateArgs(withDefaults, toolSchemas.fetchJobs);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('createJob schema requires customer_name and job_number', () => {
      const valid = {
        customer_name: 'Acme Corp',
        job_number: 'JOB-001',
      };
      expect(() => validateArgs(valid, toolSchemas.createJob)).not.toThrow();

      expect(() => validateArgs({ customer_name: 'Acme' }, toolSchemas.createJob)).toThrow();
      expect(() => validateArgs({ job_number: 'JOB-001' }, toolSchemas.createJob)).toThrow();
    });

    it('updateJob schema requires id', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'in_progress' as const,
      };
      expect(() => validateArgs(valid, toolSchemas.updateJob)).not.toThrow();

      expect(() => validateArgs({ status: 'in_progress' }, toolSchemas.updateJob)).toThrow();
    });

    it('reportScrap schema validates quantity constraints', () => {
      const valid = {
        operation_id: '123e4567-e89b-12d3-a456-426614174000',
        quantity_scrap: 5,
      };
      expect(() => validateArgs(valid, toolSchemas.reportScrap)).not.toThrow();

      expect(() => validateArgs({
        operation_id: '123e4567-e89b-12d3-a456-426614174000',
        quantity_scrap: 0,
      }, toolSchemas.reportScrap)).toThrow('at least 1');
    });
  });
});
