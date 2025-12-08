import { describe, it, expect } from 'vitest';
import {
  ValidationSeverity,
  BaseValidator,
  ValidationContext,
  ValidationError,
  ValidationResult,
} from './DataValidator';

// Create a concrete implementation for testing
class TestValidator extends BaseValidator<any> {
  constructor() {
    super('test_entities');
  }

  validateEntity(entity: any, index: number, context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];

    const nameError = this.validateRequired(entity, 'name', index);
    if (nameError) errors.push(nameError);

    const tenantError = this.validateForeignKey(
      entity,
      'tenant_id',
      context.validJobIds,
      index,
      true
    );
    if (tenantError) errors.push(tenantError);

    const countError = this.validateNumber(entity, 'count', index, {
      min: 0,
      max: 100,
      required: true,
    });
    if (countError) errors.push(countError);

    return errors;
  }

  // Expose protected methods for testing
  public testIsValidUUID(value: any): boolean {
    return this.isValidUUID(value);
  }

  public testValidateRequired(entity: any, field: string, index: number) {
    return this.validateRequired(entity, field, index);
  }

  public testValidateForeignKey(
    entity: any,
    field: string,
    validIds: string[] | undefined,
    index: number,
    required: boolean
  ) {
    return this.validateForeignKey(entity, field, validIds, index, required);
  }

  public testValidateNumber(
    entity: any,
    field: string,
    index: number,
    options: { min?: number; max?: number; required?: boolean }
  ) {
    return this.validateNumber(entity, field, index, options);
  }
}

describe('BaseValidator', () => {
  const validator = new TestValidator();
  const context: ValidationContext = {
    tenantId: 'test-tenant-id',
    validJobIds: [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    ],
  };

  describe('isValidUUID', () => {
    it('returns true for valid UUIDs', () => {
      expect(validator.testIsValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validator.testIsValidUUID('00000000-0000-0000-0000-000000000001')).toBe(true);
      expect(validator.testIsValidUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    });

    it('returns false for invalid UUIDs', () => {
      expect(validator.testIsValidUUID('not-a-uuid')).toBe(false);
      expect(validator.testIsValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(validator.testIsValidUUID('')).toBe(false);
      expect(validator.testIsValidUUID(123)).toBe(false);
      expect(validator.testIsValidUUID(null)).toBe(false);
      expect(validator.testIsValidUUID(undefined)).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('returns null for present values', () => {
      expect(validator.testValidateRequired({ name: 'test' }, 'name', 0)).toBeNull();
      expect(validator.testValidateRequired({ count: 1 }, 'count', 0)).toBeNull();
      expect(validator.testValidateRequired({ active: true }, 'active', 0)).toBeNull();
    });

    it('returns error for falsy values like 0', () => {
      // Note: The validator treats 0 as a missing value (uses !entity[field])
      const error = validator.testValidateRequired({ count: 0 }, 'count', 0);
      expect(error).not.toBeNull();
      expect(error?.field).toBe('count');
      expect(error?.constraint).toBe('NOT_NULL');
    });

    it('returns error for missing values', () => {
      const error = validator.testValidateRequired({ name: '' }, 'name', 0);
      expect(error).not.toBeNull();
      expect(error?.field).toBe('name');
      expect(error?.constraint).toBe('NOT_NULL');
      expect(error?.entityIndex).toBe(0);
    });

    it('returns error for null values', () => {
      const error = validator.testValidateRequired({ name: null }, 'name', 1);
      expect(error).not.toBeNull();
      expect(error?.entityIndex).toBe(1);
    });

    it('returns error for undefined values', () => {
      const error = validator.testValidateRequired({}, 'name', 2);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Missing required field');
    });
  });

  describe('validateForeignKey', () => {
    it('returns null for valid FK reference', () => {
      const entity = { job_id: '00000000-0000-0000-0000-000000000001' };
      const result = validator.testValidateForeignKey(
        entity,
        'job_id',
        context.validJobIds,
        0,
        true
      );
      expect(result).toBeNull();
    });

    it('returns null for optional null FK', () => {
      const entity = { job_id: null };
      const result = validator.testValidateForeignKey(
        entity,
        'job_id',
        context.validJobIds,
        0,
        false
      );
      expect(result).toBeNull();
    });

    it('returns error for required null FK', () => {
      const entity = { job_id: null };
      const result = validator.testValidateForeignKey(
        entity,
        'job_id',
        context.validJobIds,
        0,
        true
      );
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('FK_REQUIRED');
    });

    it('returns error for invalid UUID format', () => {
      const entity = { job_id: 'not-a-uuid' };
      const result = validator.testValidateForeignKey(
        entity,
        'job_id',
        context.validJobIds,
        0,
        true
      );
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('UUID_FORMAT');
    });

    it('returns error for FK referencing non-existent record', () => {
      const entity = { job_id: '99999999-9999-9999-9999-999999999999' };
      const result = validator.testValidateForeignKey(
        entity,
        'job_id',
        context.validJobIds,
        0,
        true
      );
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('FK_CONSTRAINT');
      expect(result?.message).toContain('non-existent record');
    });

    it('skips FK validation if validIds is undefined', () => {
      const entity = { job_id: '99999999-9999-9999-9999-999999999999' };
      const result = validator.testValidateForeignKey(entity, 'job_id', undefined, 0, false);
      expect(result).toBeNull();
    });
  });

  describe('validateNumber', () => {
    it('returns null for valid numbers', () => {
      expect(validator.testValidateNumber({ count: 50 }, 'count', 0, { min: 0, max: 100 })).toBeNull();
      expect(validator.testValidateNumber({ count: 0 }, 'count', 0, { min: 0 })).toBeNull();
      expect(validator.testValidateNumber({ count: 100 }, 'count', 0, { max: 100 })).toBeNull();
    });

    it('returns null for optional null number', () => {
      const result = validator.testValidateNumber({ count: null }, 'count', 0, { required: false });
      expect(result).toBeNull();
    });

    it('returns error for required null number', () => {
      const result = validator.testValidateNumber({ count: null }, 'count', 0, { required: true });
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('NOT_NULL');
    });

    it('returns error for non-number value', () => {
      const result = validator.testValidateNumber({ count: 'abc' }, 'count', 0, {});
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('TYPE_MISMATCH');
    });

    it('returns error for NaN', () => {
      const result = validator.testValidateNumber({ count: NaN }, 'count', 0, {});
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('TYPE_MISMATCH');
    });

    it('returns error for Infinity', () => {
      const result = validator.testValidateNumber({ count: Infinity }, 'count', 0, {});
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('TYPE_MISMATCH');
    });

    it('returns error for value below minimum', () => {
      const result = validator.testValidateNumber({ count: -5 }, 'count', 0, { min: 0 });
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('MIN_VALUE');
      expect(result?.message).toContain('>= 0');
    });

    it('returns error for value above maximum', () => {
      const result = validator.testValidateNumber({ count: 150 }, 'count', 0, { max: 100 });
      expect(result).not.toBeNull();
      expect(result?.constraint).toBe('MAX_VALUE');
      expect(result?.message).toContain('<= 100');
    });
  });

  describe('validateBatch', () => {
    it('returns valid result for empty array', () => {
      const result = validator.validateBatch([], context);
      expect(result.valid).toBe(true);
      expect(result.severity).toBe(ValidationSeverity.INFO);
      expect(result.httpStatus).toBe(200);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('No test_entities to validate');
    });

    it('returns error for non-array input', () => {
      const result = validator.validateBatch('not an array' as any, context);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe(ValidationSeverity.ERROR);
      expect(result.httpStatus).toBe(400);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].constraint).toBe('TYPE_MISMATCH');
    });

    it('validates all entities in batch', () => {
      const entities = [
        { name: 'Entity 1', tenant_id: '00000000-0000-0000-0000-000000000001', count: 50 },
        { name: 'Entity 2', tenant_id: '00000000-0000-0000-0000-000000000002', count: 25 },
      ];
      const result = validator.validateBatch(entities, context);
      expect(result.valid).toBe(true);
      expect(result.httpStatus).toBe(200);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain('2 test_entities validated successfully');
    });

    it('collects errors from all entities', () => {
      const entities = [
        { name: '', tenant_id: '00000000-0000-0000-0000-000000000001', count: 50 },
        { name: 'Valid', tenant_id: 'invalid-uuid', count: -5 },
      ];
      const result = validator.validateBatch(entities, context);
      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(422);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.technicalDetails).toContain('validation errors');
    });
  });
});

describe('ValidationSeverity', () => {
  it('has correct values', () => {
    expect(ValidationSeverity.ERROR).toBe('error');
    expect(ValidationSeverity.WARNING).toBe('warning');
    expect(ValidationSeverity.INFO).toBe('info');
  });
});
