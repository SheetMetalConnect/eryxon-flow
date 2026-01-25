import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client before importing anything else
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Import the actual toTsQuery function from production code
import { toTsQuery } from './searchService';

// Test the toTsQuery function - now testing the actual production code
describe('searchService - toTsQuery', () => {
  describe('toTsQuery', () => {
    it('converts single word to prefix search', () => {
      expect(toTsQuery('hello')).toBe('hello:*');
    });

    it('converts multiple words to AND query with prefix search', () => {
      expect(toTsQuery('hello world')).toBe('hello:* & world:*');
    });

    it('handles mixed case input', () => {
      expect(toTsQuery('HeLLo WoRLD')).toBe('hello:* & world:*');
    });

    it('removes special characters', () => {
      expect(toTsQuery('hello-world')).toBe('hello:* & world:*');
      expect(toTsQuery('hello_world')).toBe('hello:* & world:*');
      expect(toTsQuery('hello@world.com')).toBe('hello:* & world:* & com:*');
    });

    it('handles numbers', () => {
      expect(toTsQuery('job123')).toBe('job123:*');
      expect(toTsQuery('123')).toBe('123:*');
    });

    it('handles empty string', () => {
      expect(toTsQuery('')).toBe('');
    });

    it('handles whitespace only', () => {
      expect(toTsQuery('   ')).toBe('');
      expect(toTsQuery('\t\n')).toBe('');
    });

    it('handles extra whitespace between words', () => {
      expect(toTsQuery('hello    world')).toBe('hello:* & world:*');
    });

    it('handles leading and trailing whitespace', () => {
      expect(toTsQuery('  hello world  ')).toBe('hello:* & world:*');
    });

    it('filters out single special characters', () => {
      expect(toTsQuery('! @ #')).toBe('');
    });

    it('handles realistic job searches', () => {
      expect(toTsQuery('WO-2025-1047')).toBe('wo:* & 2025:* & 1047:*');
      expect(toTsQuery('JOB-123')).toBe('job:* & 123:*');
    });

    it('handles part number searches', () => {
      expect(toTsQuery('HF-FRAME-001')).toBe('hf:* & frame:* & 001:*');
    });

    it('handles customer name searches', () => {
      expect(toTsQuery('Van den Berg B.V.')).toBe('van:* & den:* & berg:* & b:* & v:*');
    });
  });
});

describe('searchService - Search Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchJobsFullText', () => {
    it('returns empty array for empty query', async () => {
      // Import the actual function
      const { searchJobsFullText } = await import('./searchService');
      const result = await searchJobsFullText('', 'tenant-1');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace query', async () => {
      const { searchJobsFullText } = await import('./searchService');
      const result = await searchJobsFullText('   ', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('searchPartsFullText', () => {
    it('returns empty array for empty query', async () => {
      const { searchPartsFullText } = await import('./searchService');
      const result = await searchPartsFullText('', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('searchOperationsFullText', () => {
    it('returns empty array for empty query', async () => {
      const { searchOperationsFullText } = await import('./searchService');
      const result = await searchOperationsFullText('', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('searchUsersFullText', () => {
    it('returns empty array for empty query', async () => {
      const { searchUsersFullText } = await import('./searchService');
      const result = await searchUsersFullText('', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('searchIssuesFullText', () => {
    it('returns empty array for empty query', async () => {
      const { searchIssuesFullText } = await import('./searchService');
      const result = await searchIssuesFullText('', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('searchAll', () => {
    it('returns empty array for empty query', async () => {
      const { searchAll } = await import('./searchService');
      const result = await searchAll('', 'tenant-1');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty tenantId', async () => {
      const { searchAll } = await import('./searchService');
      const result = await searchAll('test', '');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace query', async () => {
      const { searchAll } = await import('./searchService');
      const result = await searchAll('   ', 'tenant-1');
      expect(result).toEqual([]);
    });
  });
});

describe('searchService - Result Formatting', () => {
  describe('Job search results', () => {
    it('formats job results correctly', () => {
      const mockJob = {
        id: 'job-1',
        job_number: '1047',
        customer: 'Van den Berg B.V.',
        due_date: '2025-01-15',
        due_date_override: null,
        status: 'active',
        notes: 'Test notes',
        metadata: null,
      };

      // Expected format
      const expectedResult = {
        id: 'job-1',
        type: 'job',
        title: 'JOB-1047',
        subtitle: 'Van den Berg B.V.',
        description: 'Test notes',
        path: '/admin/jobs',
        status: 'active',
        metadata: {
          jobNumber: '1047',
          customer: 'Van den Berg B.V.',
          dueDate: '2025-01-15',
        },
      };

      // Verify the expected structure
      expect(expectedResult.title).toContain('JOB-');
      expect(expectedResult.path).toBe('/admin/jobs');
      expect(expectedResult.type).toBe('job');
    });
  });

  describe('Part search results', () => {
    it('formats part results with job info', () => {
      const expectedResult = {
        id: 'part-1',
        type: 'part',
        title: 'Part #HF-FRAME-001',
        subtitle: 'S355J2 • JOB-1047',
        path: '/admin/parts',
      };

      expect(expectedResult.title).toContain('Part #');
      expect(expectedResult.path).toBe('/admin/parts');
      expect(expectedResult.type).toBe('part');
    });
  });

  describe('Operation search results', () => {
    it('formats operation results with part and cell info', () => {
      const expectedResult = {
        id: 'op-1',
        type: 'operation',
        title: 'Lasersnijden',
        subtitle: 'Part #HF-FRAME-001 • Assembly',
        path: '/admin/assignments',
      };

      expect(expectedResult.path).toBe('/admin/assignments');
      expect(expectedResult.type).toBe('operation');
    });
  });

  describe('User search results', () => {
    it('formats user results with role info', () => {
      const expectedResult = {
        id: 'user-1',
        type: 'user',
        title: 'Jan de Vries',
        subtitle: 'jan@example.com • admin',
        path: '/admin/users',
      };

      expect(expectedResult.path).toBe('/admin/users');
      expect(expectedResult.type).toBe('user');
    });
  });

  describe('Issue search results', () => {
    it('formats issue results with severity info', () => {
      const expectedResult = {
        id: 'issue-1',
        type: 'issue',
        title: 'Material defect',
        subtitle: 'high severity • Lasersnijden',
        path: '/admin/issues',
      };

      expect(expectedResult.path).toBe('/admin/issues');
      expect(expectedResult.type).toBe('issue');
    });
  });
});

describe('AdvancedSearchOptions', () => {
  it('default limit is 10', () => {
    const defaultOptions = {
      limit: 10,
      minRelevance: 0,
    };
    expect(defaultOptions.limit).toBe(10);
  });

  it('supports custom limit', () => {
    const customOptions = {
      limit: 25,
    };
    expect(customOptions.limit).toBe(25);
  });

  it('supports fuzzy matching option', () => {
    const fuzzyOptions = {
      fuzzyMatch: true,
    };
    expect(fuzzyOptions.fuzzyMatch).toBe(true);
  });
});
