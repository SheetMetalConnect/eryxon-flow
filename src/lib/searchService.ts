import { supabase } from '@/integrations/supabase/client';
import { SearchResult } from '@/hooks/useGlobalSearch';
import { logger } from '@/lib/logger';

export interface AdvancedSearchOptions {
  /** Use full-text search (tsvector) when available */
  useFullTextSearch?: boolean;
  /** Maximum number of results per entity type */
  limit?: number;
  /** Minimum relevance score (0-1) for full-text search */
  minRelevance?: number;
  /** Enable fuzzy matching */
  fuzzyMatch?: boolean;
}

/**
 * Converts a search query to a tsquery-compatible format
 * Handles multiple words and creates a prefix search
 * @public Exported for testing
 */
export function toTsQuery(query: string): string {
  const words = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);

  if (words.length === 0) return '';

  return words.map(word => `${word}:*`).join(' & ');
}

/**
 * Search jobs using full-text search
 */
export async function searchJobsFullText(
  query: string,
  tenantId: string,
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10, minRelevance = 0 } = options;
  const tsQuery = toTsQuery(query);

  if (!tsQuery) return [];

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, job_number, customer, due_date, due_date_override, status, notes, metadata')
      .eq('tenant_id', tenantId)
      .textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SearchService', 'Full-text search error for jobs', error);
      return [];
    }

    return (data || []).map((job) => ({
      id: job.id,
      type: 'job' as const,
      title: `JOB-${job.job_number}`,
      subtitle: job.customer || 'No customer',
      description: job.notes || undefined,
      path: `/admin/jobs`,
      status: job.status || 'not_started',
      metadata: {
        jobNumber: job.job_number,
        customer: job.customer || undefined,
        dueDate: job.due_date_override || job.due_date || undefined,
      },
    }));
  } catch (err) {
    logger.error('SearchService', 'Error in searchJobsFullText', err);
    return [];
  }
}

/**
 * Search parts using full-text search
 */
export async function searchPartsFullText(
  query: string,
  tenantId: string,
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10 } = options;
  const tsQuery = toTsQuery(query);

  if (!tsQuery) return [];

  try {
    const { data, error } = await supabase
      .from('parts')
      .select(`
        id,
        part_number,
        material,
        status,
        notes,
        metadata,
        quantity,
        job_id,
        jobs!inner(job_number, customer)
      `)
      .eq('tenant_id', tenantId)
      .textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SearchService', 'Full-text search error for parts', error);
      return [];
    }

    return (data || []).map((part: { id: string; part_number: string; material: string; status: string; notes: string | null; metadata: unknown; quantity: number; job_id: string; jobs?: { job_number: string; customer: string | null } }) => ({
      id: part.id,
      type: 'part' as const,
      title: `Part #${part.part_number}`,
      subtitle: `${part.material} • JOB-${part.jobs?.job_number || 'N/A'}`,
      description: part.notes || undefined,
      path: `/admin/parts`,
      status: part.status || 'not_started',
      metadata: {
        partNumber: part.part_number,
        material: part.material,
        jobNumber: part.jobs?.job_number,
        customer: part.jobs?.customer,
      },
    }));
  } catch (err) {
    logger.error('SearchService', 'Error in searchPartsFullText', err);
    return [];
  }
}

/**
 * Search operations using full-text search
 */
export async function searchOperationsFullText(
  query: string,
  tenantId: string,
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10 } = options;
  const tsQuery = toTsQuery(query);

  if (!tsQuery) return [];

  try {
    const { data, error } = await supabase
      .from('operations')
      .select(`
        id,
        operation_name,
        status,
        notes,
        sequence,
        estimated_time,
        actual_time,
        completion_percentage,
        part_id,
        parts!inner(part_number, job_id, jobs!inner(job_number, customer)),
        cells!inner(name),
        profiles(full_name, email)
      `)
      .eq('tenant_id', tenantId)
      .textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SearchService', 'Full-text search error for operations', error);
      return [];
    }

    return ((data || []) as unknown as { id: string; operation_name: string; status: string; notes: string | null; sequence: number; estimated_time: number; actual_time: number; completion_percentage: number; part_id: string; parts?: { part_number: string; job_id: string; jobs?: { job_number: string; customer: string | null } }; cells?: { name: string }; profiles?: { full_name: string | null; email: string } }[]).map((operation) => ({
      id: operation.id,
      type: 'operation' as const,
      title: operation.operation_name,
      subtitle: `Part #${operation.parts?.part_number} • ${operation.cells?.name || 'No Cell'}`,
      description: operation.notes || undefined,
      path: `/admin/assignments`,
      status: operation.status || 'not_started',
      metadata: {
        operationName: operation.operation_name,
        partNumber: operation.parts?.part_number,
        jobNumber: operation.parts?.jobs?.job_number,
        cellName: operation.cells?.name,
        assignedTo: operation.profiles?.full_name || operation.profiles?.email,
      },
    }));
  } catch (err) {
    logger.error('SearchService', 'Error in searchOperationsFullText', err);
    return [];
  }
}

/**
 * Search users using full-text search
 */
export async function searchUsersFullText(
  query: string,
  tenantId: string,
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10 } = options;
  const tsQuery = toTsQuery(query);

  if (!tsQuery) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, username, role, active')
      .eq('tenant_id', tenantId)
      .textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SearchService', 'Full-text search error for users', error);
      return [];
    }

    return (data || []).map((user) => ({
      id: user.id,
      type: 'user' as const,
      title: user.full_name || user.username,
      subtitle: `${user.email} • ${user.role}`,
      description: user.active ? 'Active' : 'Inactive',
      path: `/admin/users`,
      metadata: {
        email: user.email,
        role: user.role,
      },
    }));
  } catch (err) {
    logger.error('SearchService', 'Error in searchUsersFullText', err);
    return [];
  }
}

/**
 * Search issues using full-text search
 */
export async function searchIssuesFullText(
  query: string,
  tenantId: string,
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10 } = options;
  const tsQuery = toTsQuery(query);

  if (!tsQuery) return [];

  try {
    const { data, error } = await supabase
      .from('issues')
      .select(`
        id,
        description,
        severity,
        status,
        resolution_notes,
        operation_id,
        operations!inner(
          operation_name,
          parts!inner(part_number, jobs!inner(job_number))
        ),
        profiles!issues_created_by_fkey(full_name, email)
      `)
      .eq('tenant_id', tenantId)
      .textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SearchService', 'Full-text search error for issues', error);
      return [];
    }

    return (data || []).map((issue: { id: string; description: string; severity: string; status: string; resolution_notes: string | null; operation_id: string; operations?: { operation_name: string; parts?: { part_number: string; jobs?: { job_number: string } } }; profiles?: { full_name: string | null; email: string } }) => ({
      id: issue.id,
      type: 'issue' as const,
      title: issue.description || 'Untitled Issue',
      subtitle: `${issue.severity} severity • ${issue.operations?.operation_name || 'N/A'}`,
      description: issue.resolution_notes || undefined,
      path: `/admin/issues`,
      status: issue.status || 'open',
      metadata: {
        operationName: issue.operations?.operation_name,
        partNumber: issue.operations?.parts?.part_number,
        jobNumber: issue.operations?.parts?.jobs?.job_number,
      },
    }));
  } catch (err) {
    logger.error('SearchService', 'Error in searchIssuesFullText', err);
    return [];
  }
}

/**
 * Unified search function that uses full-text search across all entities
 */
export async function searchAll(
  query: string,
  tenantId: string,
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  if (!query.trim() || !tenantId) {
    return [];
  }

  const searchPromises = [
    searchJobsFullText(query, tenantId, options),
    searchPartsFullText(query, tenantId, options),
    searchOperationsFullText(query, tenantId, options),
    searchUsersFullText(query, tenantId, options),
    searchIssuesFullText(query, tenantId, options),
  ];

  try {
    const results = await Promise.all(searchPromises);
    return results.flat();
  } catch (error) {
    logger.error('SearchService', 'Error in searchAll', error);
    return [];
  }
}
