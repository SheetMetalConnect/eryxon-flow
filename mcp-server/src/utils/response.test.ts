/**
 * Response utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  successResponse,
  jsonResponse,
  paginatedResponse,
  structuredResponse,
  errorResponse,
  type PaginationMeta,
} from './response.js';
import { AppError, ErrorCode } from './errors.js';

describe('response utilities', () => {
  describe('successResponse', () => {
    it('creates text response', () => {
      const result = successResponse('Operation completed');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation completed');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('jsonResponse', () => {
    it('formats data as JSON', () => {
      const data = { id: '123', name: 'Test' };
      const result = jsonResponse(data);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(data);
    });

    it('includes message when provided', () => {
      const data = { count: 5 };
      const result = jsonResponse(data, 'Found items');
      expect(result.content[0].text).toContain('Found items');
      expect(result.content[0].text).toContain('5');
    });

    it('pretty-prints JSON', () => {
      const data = { a: 1, b: 2 };
      const result = jsonResponse(data);
      expect(result.content[0].text).toContain('\n');
      expect(result.content[0].text).toContain('  '); // indentation
    });
  });

  describe('paginatedResponse', () => {
    it('creates response with pagination metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination: PaginationMeta = {
        offset: 0,
        limit: 50,
        total: 100,
        has_more: true,
      };
      const result = paginatedResponse(data, pagination);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual(data);
      expect(parsed.pagination).toEqual(pagination);
    });

    it('includes message when provided', () => {
      const result = paginatedResponse([], {
        offset: 0,
        limit: 50,
        total: 0,
        has_more: false,
      }, 'No results');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.message).toBe('No results');
    });

    it('sets has_more correctly', () => {
      const lastPage = paginatedResponse([], {
        offset: 100,
        limit: 50,
        total: 120,
        has_more: false,
      });

      const parsed = JSON.parse(lastPage.content[0].text);
      expect(parsed.pagination.has_more).toBe(false);
    });
  });

  describe('structuredResponse', () => {
    it('creates success response', () => {
      const data = { id: '123', status: 'completed' };
      const result = structuredResponse(data, 'Operation successful');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual(data);
      expect(parsed.message).toBe('Operation successful');
    });

    it('works without message', () => {
      const result = structuredResponse({ count: 5 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({ count: 5 });
      expect(parsed.message).toBeUndefined();
    });

    it('includes pagination when provided', () => {
      const pagination: PaginationMeta = {
        offset: 0,
        limit: 10,
        total: 25,
        has_more: true,
      };
      const result = structuredResponse([1, 2, 3], 'Found items', pagination);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pagination).toEqual(pagination);
    });
  });

  describe('errorResponse', () => {
    it('formats AppError correctly', () => {
      const error = new AppError(ErrorCode.NOT_FOUND, 'Job not found', {
        context: { jobId: '123' },
      });
      const result = errorResponse(error);

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(parsed.error.message).toBe('Job not found');
      expect(parsed.error.context).toEqual({ jobId: '123' });
    });

    it('wraps standard Error', () => {
      const error = new Error('Something failed');
      const result = errorResponse(error);

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(parsed.error.message).toBe('Something failed');
    });

    it('wraps unknown errors', () => {
      const result = errorResponse('string error');

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error.message).toBe('string error');
    });
  });
});
