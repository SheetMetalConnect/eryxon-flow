import { describe, it, expect } from 'vitest';
import {
  CellValidator,
  JobValidator,
  PartValidator,
  OperationValidator,
  TimeEntryValidator,
  QuantityRecordValidator,
  IssueValidator,
  OperationResourceValidator,
} from './EntityValidators';
import { ValidationContext } from './DataValidator';

describe('CellValidator', () => {
  const validator = new CellValidator();
  const context: ValidationContext = { tenantId: 'test-tenant' };

  it('validates valid cell', () => {
    const cell = {
      tenant_id: 'test-tenant',
      name: 'Cell A',
      sequence: 1,
      wip_limit: 10,
    };
    const errors = validator.validateEntity(cell, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires tenant_id', () => {
    const cell = { name: 'Cell A' };
    const errors = validator.validateEntity(cell, 0, context);
    expect(errors.some(e => e.field === 'tenant_id')).toBe(true);
  });

  it('requires name', () => {
    const cell = { tenant_id: 'test-tenant' };
    const errors = validator.validateEntity(cell, 0, context);
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('validates sequence is non-negative', () => {
    const cell = { tenant_id: 'test-tenant', name: 'Cell A', sequence: -1 };
    const errors = validator.validateEntity(cell, 0, context);
    expect(errors.some(e => e.field === 'sequence')).toBe(true);
  });

  it('validates wip_limit is non-negative', () => {
    const cell = { tenant_id: 'test-tenant', name: 'Cell A', wip_limit: -5 };
    const errors = validator.validateEntity(cell, 0, context);
    expect(errors.some(e => e.field === 'wip_limit')).toBe(true);
  });
});

describe('JobValidator', () => {
  const validator = new JobValidator();
  const context: ValidationContext = { tenantId: 'test-tenant' };

  it('validates valid job', () => {
    const job = { tenant_id: 'test-tenant', job_number: 'JOB-001' };
    const errors = validator.validateEntity(job, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires tenant_id', () => {
    const job = { job_number: 'JOB-001' };
    const errors = validator.validateEntity(job, 0, context);
    expect(errors.some(e => e.field === 'tenant_id')).toBe(true);
  });

  it('requires job_number', () => {
    const job = { tenant_id: 'test-tenant' };
    const errors = validator.validateEntity(job, 0, context);
    expect(errors.some(e => e.field === 'job_number')).toBe(true);
  });
});

describe('PartValidator', () => {
  const validator = new PartValidator();
  const validJobId = '00000000-0000-0000-0000-000000000001';
  const validPartId = '00000000-0000-0000-0000-000000000002';
  const context: ValidationContext = {
    tenantId: 'test-tenant',
    validJobIds: [validJobId],
    validPartIds: [validPartId],
  };

  it('validates valid part', () => {
    const part = {
      tenant_id: 'test-tenant',
      part_number: 'PART-001',
      job_id: validJobId,
      quantity: 10,
    };
    const errors = validator.validateEntity(part, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires tenant_id', () => {
    const part = { part_number: 'PART-001', job_id: validJobId };
    const errors = validator.validateEntity(part, 0, context);
    expect(errors.some(e => e.field === 'tenant_id')).toBe(true);
  });

  it('requires part_number', () => {
    const part = { tenant_id: 'test-tenant', job_id: validJobId };
    const errors = validator.validateEntity(part, 0, context);
    expect(errors.some(e => e.field === 'part_number')).toBe(true);
  });

  it('requires valid job_id FK', () => {
    const part = {
      tenant_id: 'test-tenant',
      part_number: 'PART-001',
      job_id: '99999999-9999-9999-9999-999999999999',
    };
    const errors = validator.validateEntity(part, 0, context);
    expect(errors.some(e => e.field === 'job_id')).toBe(true);
  });

  it('validates optional parent_part_id FK', () => {
    const part = {
      tenant_id: 'test-tenant',
      part_number: 'PART-001',
      job_id: validJobId,
      parent_part_id: validPartId,
    };
    const errors = validator.validateEntity(part, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('validates quantity is non-negative', () => {
    const part = {
      tenant_id: 'test-tenant',
      part_number: 'PART-001',
      job_id: validJobId,
      quantity: -5,
    };
    const errors = validator.validateEntity(part, 0, context);
    expect(errors.some(e => e.field === 'quantity')).toBe(true);
  });
});

describe('OperationValidator', () => {
  const validator = new OperationValidator();
  const validPartId = '00000000-0000-0000-0000-000000000001';
  const validCellId = '00000000-0000-0000-0000-000000000002';
  const context: ValidationContext = {
    tenantId: 'test-tenant',
    validPartIds: [validPartId],
    validCellIds: [validCellId],
  };

  it('validates valid operation', () => {
    const operation = {
      tenant_id: 'test-tenant',
      operation_name: 'Cutting',
      part_id: validPartId,
      cell_id: validCellId,
      sequence: 1,
      estimated_time: 60,
    };
    const errors = validator.validateEntity(operation, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires operation_name', () => {
    const operation = {
      tenant_id: 'test-tenant',
      part_id: validPartId,
      cell_id: validCellId,
    };
    const errors = validator.validateEntity(operation, 0, context);
    expect(errors.some(e => e.field === 'operation_name')).toBe(true);
  });

  it('requires valid part_id FK', () => {
    const operation = {
      tenant_id: 'test-tenant',
      operation_name: 'Cutting',
      part_id: 'invalid',
      cell_id: validCellId,
    };
    const errors = validator.validateEntity(operation, 0, context);
    expect(errors.some(e => e.field === 'part_id')).toBe(true);
  });

  it('requires valid cell_id FK', () => {
    const operation = {
      tenant_id: 'test-tenant',
      operation_name: 'Cutting',
      part_id: validPartId,
      cell_id: 'invalid',
    };
    const errors = validator.validateEntity(operation, 0, context);
    expect(errors.some(e => e.field === 'cell_id')).toBe(true);
  });

  it('validates estimated_time is non-negative', () => {
    const operation = {
      tenant_id: 'test-tenant',
      operation_name: 'Cutting',
      part_id: validPartId,
      cell_id: validCellId,
      estimated_time: -10,
    };
    const errors = validator.validateEntity(operation, 0, context);
    expect(errors.some(e => e.field === 'estimated_time')).toBe(true);
  });
});

describe('TimeEntryValidator', () => {
  const validator = new TimeEntryValidator();
  const validOperationId = '00000000-0000-0000-0000-000000000001';
  const validOperatorId = '00000000-0000-0000-0000-000000000002';
  const context: ValidationContext = {
    tenantId: 'test-tenant',
    validOperationIds: [validOperationId],
    validOperatorIds: [validOperatorId],
  };

  it('validates valid time entry', () => {
    const entry = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
      operator_id: validOperatorId,
      duration: 30,
    };
    const errors = validator.validateEntity(entry, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires operation_id', () => {
    const entry = { tenant_id: 'test-tenant', duration: 30 };
    const errors = validator.validateEntity(entry, 0, context);
    expect(errors.some(e => e.field === 'operation_id')).toBe(true);
  });

  it('allows null operator_id', () => {
    const entry = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
      operator_id: null,
      duration: 30,
    };
    const errors = validator.validateEntity(entry, 0, context);
    expect(errors.some(e => e.field === 'operator_id')).toBe(false);
  });

  it('validates duration is non-negative', () => {
    const entry = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
      duration: -10,
    };
    const errors = validator.validateEntity(entry, 0, context);
    expect(errors.some(e => e.field === 'duration')).toBe(true);
  });
});

describe('QuantityRecordValidator', () => {
  const validator = new QuantityRecordValidator();
  const validOperationId = '00000000-0000-0000-0000-000000000001';
  const validOperatorId = '00000000-0000-0000-0000-000000000002';
  const validScrapReasonId = '00000000-0000-0000-0000-000000000003';
  const context: ValidationContext = {
    tenantId: 'test-tenant',
    validOperationIds: [validOperationId],
    validOperatorIds: [validOperatorId],
    validScrapReasonIds: [validScrapReasonId],
  };

  it('validates valid quantity record', () => {
    const record = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
      recorded_by: validOperatorId,
      quantity_produced: 100,
      quantity_good: 95,
      quantity_scrap: 5,
      quantity_rework: 0,
    };
    const errors = validator.validateEntity(record, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires operation_id', () => {
    const record = {
      tenant_id: 'test-tenant',
      quantity_produced: 100,
    };
    const errors = validator.validateEntity(record, 0, context);
    expect(errors.some(e => e.field === 'operation_id')).toBe(true);
  });

  it('validates quantity fields are non-negative', () => {
    const record = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
      quantity_produced: -10,
      quantity_good: -5,
      quantity_scrap: -1,
      quantity_rework: -2,
    };
    const errors = validator.validateEntity(record, 0, context);
    expect(errors.some(e => e.field === 'quantity_produced')).toBe(true);
    expect(errors.some(e => e.field === 'quantity_good')).toBe(true);
    expect(errors.some(e => e.field === 'quantity_scrap')).toBe(true);
    expect(errors.some(e => e.field === 'quantity_rework')).toBe(true);
  });

  it('validates scrap_reason_id FK when provided', () => {
    const record = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
      scrap_reason_id: validScrapReasonId,
      quantity_scrap: 5,
    };
    const errors = validator.validateEntity(record, 0, context);
    expect(errors).toHaveLength(0);
  });
});

describe('IssueValidator', () => {
  const validator = new IssueValidator();
  const validOperationId = '00000000-0000-0000-0000-000000000001';
  const validOperatorId = '00000000-0000-0000-0000-000000000002';
  const context: ValidationContext = {
    tenantId: 'test-tenant',
    validOperationIds: [validOperationId],
    validOperatorIds: [validOperatorId],
  };

  it('validates valid issue', () => {
    const issue = {
      tenant_id: 'test-tenant',
      description: 'Machine malfunction',
      operation_id: validOperationId,
      created_by: validOperatorId,
    };
    const errors = validator.validateEntity(issue, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires description', () => {
    const issue = {
      tenant_id: 'test-tenant',
      operation_id: validOperationId,
    };
    const errors = validator.validateEntity(issue, 0, context);
    expect(errors.some(e => e.field === 'description')).toBe(true);
  });

  it('requires operation_id', () => {
    const issue = {
      tenant_id: 'test-tenant',
      description: 'Issue description',
    };
    const errors = validator.validateEntity(issue, 0, context);
    expect(errors.some(e => e.field === 'operation_id')).toBe(true);
  });

  it('allows optional created_by and reviewed_by', () => {
    const issue = {
      tenant_id: 'test-tenant',
      description: 'Issue description',
      operation_id: validOperationId,
      created_by: null,
      reviewed_by: null,
    };
    const errors = validator.validateEntity(issue, 0, context);
    expect(errors.some(e => e.field === 'created_by')).toBe(false);
    expect(errors.some(e => e.field === 'reviewed_by')).toBe(false);
  });
});

describe('OperationResourceValidator', () => {
  const validator = new OperationResourceValidator();
  const validOperationId = '00000000-0000-0000-0000-000000000001';
  const validResourceId = '00000000-0000-0000-0000-000000000002';
  const context: ValidationContext = {
    tenantId: 'test-tenant',
    validOperationIds: [validOperationId],
    validResourceIds: [validResourceId],
  };

  it('validates valid operation resource link', () => {
    const link = {
      operation_id: validOperationId,
      resource_id: validResourceId,
      quantity: 1,
    };
    const errors = validator.validateEntity(link, 0, context);
    expect(errors).toHaveLength(0);
  });

  it('requires operation_id', () => {
    const link = { resource_id: validResourceId, quantity: 1 };
    const errors = validator.validateEntity(link, 0, context);
    expect(errors.some(e => e.field === 'operation_id')).toBe(true);
  });

  it('requires resource_id', () => {
    const link = { operation_id: validOperationId, quantity: 1 };
    const errors = validator.validateEntity(link, 0, context);
    expect(errors.some(e => e.field === 'resource_id')).toBe(true);
  });

  it('validates quantity is non-negative', () => {
    const link = {
      operation_id: validOperationId,
      resource_id: validResourceId,
      quantity: -1,
    };
    const errors = validator.validateEntity(link, 0, context);
    expect(errors.some(e => e.field === 'quantity')).toBe(true);
  });
});
