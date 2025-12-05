import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SearchResultType = 'job' | 'part' | 'operation' | 'user' | 'issue' | 'resource' | 'material';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  description?: string;
  path: string;
  status?: string;
  metadata?: {
    jobNumber?: string;
    partNumber?: string;
    customer?: string;
    material?: string;
    operationName?: string;
    cellName?: string;
    assignedTo?: string;
    dueDate?: string;
    email?: string;
    role?: string;
    resourceType?: string;
    location?: string;
    identifier?: string;
    color?: string;
  };
}

export interface SearchFilters {
  types?: SearchResultType[];
  statuses?: string[];
  limit?: number;
}

export function useGlobalSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  const searchJobs = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, job_number, customer, due_date, due_date_override, status, notes, metadata')
      .eq('tenant_id', profile.tenant_id)
      .or(`job_number.ilike.%${query}%,customer.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching jobs:', error);
      return [];
    }

    return (jobs || []).map((job) => ({
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
  }, [profile?.tenant_id]);

  const searchParts = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: parts, error } = await supabase
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
      .eq('tenant_id', profile.tenant_id)
      .or(`part_number.ilike.%${query}%,material.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching parts:', error);
      return [];
    }

    return (parts || []).map((part: any) => ({
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
  }, [profile?.tenant_id]);

  const searchOperations = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: operations, error } = await supabase
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
      .eq('tenant_id', profile.tenant_id)
      .or(`operation_name.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching operations:', error);
      return [];
    }

    return (operations || []).map((operation: any) => ({
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
  }, [profile?.tenant_id]);

  const searchUsers = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, username, role, active')
      .eq('tenant_id', profile.tenant_id)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return (users || []).map((user) => ({
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
  }, [profile?.tenant_id]);

  const searchIssues = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: issues, error } = await supabase
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
      .eq('tenant_id', profile.tenant_id)
      .or(`description.ilike.%${query}%,resolution_notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching issues:', error);
      return [];
    }

    return (issues || []).map((issue: any) => ({
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
  }, [profile?.tenant_id]);

  const searchResources = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: resources, error } = await supabase
      .from('resources')
      .select('id, name, type, description, identifier, location, active, status')
      .eq('tenant_id', profile.tenant_id)
      .or(`name.ilike.%${query}%,type.ilike.%${query}%,description.ilike.%${query}%,identifier.ilike.%${query}%,location.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching resources:', error);
      return [];
    }

    return (resources || []).map((resource) => ({
      id: resource.id,
      type: 'resource' as const,
      title: resource.name,
      subtitle: `${resource.type}${resource.location ? ` • ${resource.location}` : ''}`,
      description: resource.description || undefined,
      path: `/admin/config/resources`,
      status: resource.active ? 'active' : 'inactive',
      metadata: {
        resourceType: resource.type,
        location: resource.location || undefined,
        identifier: resource.identifier || undefined,
      },
    }));
  }, [profile?.tenant_id]);

  const searchMaterials = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    if (!profile?.tenant_id) return [];

    const { data: materials, error } = await supabase
      .from('materials')
      .select('id, name, description, color, active')
      .eq('tenant_id', profile.tenant_id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching materials:', error);
      return [];
    }

    return (materials || []).map((material) => ({
      id: material.id,
      type: 'material' as const,
      title: material.name,
      subtitle: material.description || 'No description',
      description: material.active ? 'Active' : 'Inactive',
      path: `/admin/config/materials`,
      status: material.active ? 'active' : 'inactive',
      metadata: {
        color: material.color || undefined,
      },
    }));
  }, [profile?.tenant_id]);

  const search = useCallback(async (
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResult[]> => {
    if (!query.trim() || !profile?.tenant_id) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const limit = filters?.limit || 10;
      const types = filters?.types || ['job', 'part', 'operation', 'user', 'issue', 'resource', 'material'];

      const searchPromises: Promise<SearchResult[]>[] = [];

      if (types.includes('job')) {
        searchPromises.push(searchJobs(query, limit));
      }
      if (types.includes('part')) {
        searchPromises.push(searchParts(query, limit));
      }
      if (types.includes('operation')) {
        searchPromises.push(searchOperations(query, limit));
      }
      if (types.includes('user')) {
        searchPromises.push(searchUsers(query, limit));
      }
      if (types.includes('issue')) {
        searchPromises.push(searchIssues(query, limit));
      }
      if (types.includes('resource')) {
        searchPromises.push(searchResources(query, limit));
      }
      if (types.includes('material')) {
        searchPromises.push(searchMaterials(query, limit));
      }

      const results = await Promise.all(searchPromises);
      const flatResults = results.flat();

      // Apply status filter if provided
      if (filters?.statuses && filters.statuses.length > 0) {
        return flatResults.filter(result =>
          result.status && filters.statuses!.includes(result.status)
        );
      }

      return flatResults;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      setError(error);
      console.error('Search error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, searchJobs, searchParts, searchOperations, searchUsers, searchIssues, searchResources, searchMaterials]);

  return {
    search,
    loading,
    error,
  };
}
