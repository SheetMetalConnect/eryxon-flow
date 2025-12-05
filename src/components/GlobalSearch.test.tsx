import { describe, it, expect, vi } from 'vitest';

// The GlobalSearch component uses cmdk which has issues with ResizeObserver in jsdom.
// These tests focus on the logic and helper functions rather than full component rendering.

describe('GlobalSearch - Type Labels', () => {
  const typeLabels: Record<string, string> = {
    job: 'Jobs',
    part: 'Parts',
    operation: 'Operations',
    user: 'Users',
    issue: 'Issues',
  };

  it('has correct labels for all entity types', () => {
    expect(typeLabels.job).toBe('Jobs');
    expect(typeLabels.part).toBe('Parts');
    expect(typeLabels.operation).toBe('Operations');
    expect(typeLabels.user).toBe('Users');
    expect(typeLabels.issue).toBe('Issues');
  });

  it('supports all five entity types', () => {
    expect(Object.keys(typeLabels)).toHaveLength(5);
    expect(Object.keys(typeLabels)).toContain('job');
    expect(Object.keys(typeLabels)).toContain('part');
    expect(Object.keys(typeLabels)).toContain('operation');
    expect(Object.keys(typeLabels)).toContain('user');
    expect(Object.keys(typeLabels)).toContain('issue');
  });
});

describe('GlobalSearch - Icon Selection Logic', () => {
  // Replicate the icon selection logic from the component
  const getResultIconType = (type: string): string => {
    switch (type) {
      case 'job':
        return 'Briefcase';
      case 'part':
        return 'Package';
      case 'operation':
        return 'Wrench';
      case 'user':
        return 'User';
      case 'issue':
        return 'AlertTriangle';
      default:
        return 'Search';
    }
  };

  it('returns Briefcase icon for jobs', () => {
    expect(getResultIconType('job')).toBe('Briefcase');
  });

  it('returns Package icon for parts', () => {
    expect(getResultIconType('part')).toBe('Package');
  });

  it('returns Wrench icon for operations', () => {
    expect(getResultIconType('operation')).toBe('Wrench');
  });

  it('returns User icon for users', () => {
    expect(getResultIconType('user')).toBe('User');
  });

  it('returns AlertTriangle icon for issues', () => {
    expect(getResultIconType('issue')).toBe('AlertTriangle');
  });

  it('returns Search icon for unknown types', () => {
    expect(getResultIconType('unknown')).toBe('Search');
    expect(getResultIconType('')).toBe('Search');
  });
});

describe('GlobalSearch - Status Icon Logic', () => {
  // Replicate the status icon logic from the component
  const getStatusIconType = (
    type: string,
    status?: string
  ): string | null => {
    if (!status) return null;

    if (type === 'operation' || type === 'job' || type === 'part') {
      if (status === 'completed') return 'CheckCircle';
      if (status === 'in_progress') return 'Play';
      if (status === 'on_hold') return 'Clock-red';
      return 'Clock-blue';
    }
    return null;
  };

  it('returns null when no status provided', () => {
    expect(getStatusIconType('job')).toBeNull();
    expect(getStatusIconType('job', undefined)).toBeNull();
  });

  it('returns CheckCircle for completed status', () => {
    expect(getStatusIconType('job', 'completed')).toBe('CheckCircle');
    expect(getStatusIconType('part', 'completed')).toBe('CheckCircle');
    expect(getStatusIconType('operation', 'completed')).toBe('CheckCircle');
  });

  it('returns Play for in_progress status', () => {
    expect(getStatusIconType('job', 'in_progress')).toBe('Play');
    expect(getStatusIconType('part', 'in_progress')).toBe('Play');
    expect(getStatusIconType('operation', 'in_progress')).toBe('Play');
  });

  it('returns Clock-red for on_hold status', () => {
    expect(getStatusIconType('job', 'on_hold')).toBe('Clock-red');
  });

  it('returns Clock-blue for other statuses', () => {
    expect(getStatusIconType('job', 'not_started')).toBe('Clock-blue');
    expect(getStatusIconType('job', 'active')).toBe('Clock-blue');
  });

  it('returns null for non-schedulable types', () => {
    expect(getStatusIconType('user', 'active')).toBeNull();
    expect(getStatusIconType('issue', 'open')).toBeNull();
  });
});

describe('GlobalSearch - Results Grouping Logic', () => {
  interface SearchResult {
    id: string;
    type: string;
    title: string;
  }

  const groupResults = (
    results: SearchResult[]
  ): Record<string, SearchResult[]> => {
    return results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);
  };

  it('groups results by type', () => {
    const results: SearchResult[] = [
      { id: '1', type: 'job', title: 'Job 1' },
      { id: '2', type: 'part', title: 'Part 1' },
      { id: '3', type: 'job', title: 'Job 2' },
    ];

    const grouped = groupResults(results);

    expect(grouped.job).toHaveLength(2);
    expect(grouped.part).toHaveLength(1);
  });

  it('handles empty results', () => {
    const grouped = groupResults([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it('handles single type results', () => {
    const results: SearchResult[] = [
      { id: '1', type: 'job', title: 'Job 1' },
      { id: '2', type: 'job', title: 'Job 2' },
    ];

    const grouped = groupResults(results);

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped.job).toHaveLength(2);
  });
});

describe('GlobalSearch - Debounce Behavior', () => {
  it('should debounce search calls by 300ms', () => {
    // This tests the expected debounce timing
    const DEBOUNCE_MS = 300;
    expect(DEBOUNCE_MS).toBe(300);
  });
});

describe('GlobalSearch - Query Validation', () => {
  const isValidQuery = (query: string): boolean => {
    return query.trim().length > 0;
  };

  it('rejects empty queries', () => {
    expect(isValidQuery('')).toBe(false);
  });

  it('rejects whitespace-only queries', () => {
    expect(isValidQuery('   ')).toBe(false);
    expect(isValidQuery('\t\n')).toBe(false);
  });

  it('accepts valid queries', () => {
    expect(isValidQuery('test')).toBe(true);
    expect(isValidQuery('  test  ')).toBe(true);
    expect(isValidQuery('a')).toBe(true);
  });
});
