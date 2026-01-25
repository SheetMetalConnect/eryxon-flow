/**
 * Search Configurations
 *
 * Defines search behavior for each entity type.
 * Open/Closed Principle - add new entities by adding configs, not modifying code.
 *
 * IMPORTANT: No user-facing strings in this file.
 * All fallbacks should be null - UI layer handles localization.
 *
 * Join strategy:
 * - !inner joins: Used when relation is required (e.g., parts must have jobs)
 * - Regular joins: Used when relation is optional (e.g., operations may not have cells)
 */

import type { EntitySearchConfig, SearchResult } from "./types";

// Type helpers for raw database results
interface JobRow {
  id: string;
  job_number: string;
  customer: string | null;
  due_date: string;
  due_date_override: string | null;
  status: string | null;
  notes: string | null;
}

interface PartRow {
  id: string;
  part_number: string;
  material: string | null;
  status: string | null;
  notes: string | null;
  // !inner join - parts must have jobs
  jobs: { job_number: string; customer: string | null } | null;
}

interface OperationRow {
  id: string;
  operation_name: string;
  status: string | null;
  notes: string | null;
  // !inner join - operations must have parts with jobs
  parts: {
    part_number: string;
    jobs: { job_number: string; customer: string | null } | null;
  } | null;
  // Regular join - cell assignment is optional
  cells: { name: string } | null;
  // Regular join - operator assignment is optional
  profiles: { full_name: string | null; email: string } | null;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  username: string;
  role: string;
  active: boolean;
}

interface IssueRow {
  id: string;
  description: string | null;
  severity: string;
  status: string | null;
  resolution_notes: string | null;
  // !inner join - issues must have operations with parts
  operations: {
    operation_name: string;
    parts: {
      part_number: string;
      jobs: { job_number: string } | null;
    } | null;
  } | null;
}

interface ResourceRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  identifier: string | null;
  location: string | null;
  active: boolean;
}

interface MaterialRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
}

/**
 * Helper to build subtitle with optional segments
 * Returns null if all segments are null/undefined
 */
function buildSubtitle(
  ...segments: Array<string | null | undefined>
): string | null {
  const validSegments = segments.filter(
    (s): s is string => s !== null && s !== undefined && s !== ""
  );
  return validSegments.length > 0 ? validSegments.join(" • ") : null;
}

/**
 * Job search configuration
 */
export const jobSearchConfig: EntitySearchConfig<JobRow> = {
  tableName: "jobs",
  type: "job",
  selectFields:
    "id, job_number, customer, due_date, due_date_override, status, notes",
  searchColumns: ["job_number", "customer", "notes"],
  resultPath: "/admin/jobs",
  mapResult: (job): SearchResult => ({
    id: job.id,
    type: "job",
    title: `JOB-${job.job_number}`,
    subtitle: job.customer, // null if no customer - UI handles fallback
    description: job.notes,
    path: "/admin/jobs",
    status: job.status ?? undefined,
    metadata: {
      jobNumber: job.job_number,
      customer: job.customer ?? undefined,
      dueDate: job.due_date_override ?? job.due_date ?? undefined,
    },
  }),
};

/**
 * Part search configuration
 * Uses !inner join on jobs - parts must belong to a job
 */
export const partSearchConfig: EntitySearchConfig<PartRow> = {
  tableName: "parts",
  type: "part",
  // !inner: Parts must have jobs - excludes orphaned parts
  selectFields: `
    id,
    part_number,
    material,
    status,
    notes,
    jobs!inner(job_number, customer)
  `,
  searchColumns: ["part_number", "material", "notes"],
  resultPath: "/admin/parts",
  mapResult: (part): SearchResult => ({
    id: part.id,
    type: "part",
    title: `Part #${part.part_number}`,
    subtitle: buildSubtitle(
      part.material,
      part.jobs?.job_number ? `JOB-${part.jobs.job_number}` : null
    ),
    description: part.notes,
    path: "/admin/parts",
    status: part.status ?? undefined,
    metadata: {
      partNumber: part.part_number,
      material: part.material ?? undefined,
      jobNumber: part.jobs?.job_number,
      customer: part.jobs?.customer ?? undefined,
    },
  }),
};

/**
 * Operation search configuration
 * Uses !inner join on parts/jobs - operations must belong to parts with jobs
 * Uses regular join on cells/profiles - these are optional
 */
export const operationSearchConfig: EntitySearchConfig<OperationRow> = {
  tableName: "operations",
  type: "operation",
  // !inner on parts/jobs: Operations must have parts with jobs
  // Regular join on cells/profiles: Cell and operator assignment are optional
  selectFields: `
    id,
    operation_name,
    status,
    notes,
    parts!inner(part_number, jobs!inner(job_number, customer)),
    cells(name),
    profiles(full_name, email)
  `,
  searchColumns: ["operation_name", "notes"],
  resultPath: "/admin/assignments",
  mapResult: (op): SearchResult => ({
    id: op.id,
    type: "operation",
    title: op.operation_name,
    subtitle: buildSubtitle(
      op.parts?.part_number ? `Part #${op.parts.part_number}` : null,
      op.cells?.name
    ),
    description: op.notes,
    path: "/admin/assignments",
    status: op.status ?? undefined,
    metadata: {
      operationName: op.operation_name,
      partNumber: op.parts?.part_number,
      jobNumber: op.parts?.jobs?.job_number,
      cellName: op.cells?.name,
      assignedTo: op.profiles?.full_name ?? op.profiles?.email,
    },
  }),
};

/**
 * User search configuration
 */
export const userSearchConfig: EntitySearchConfig<UserRow> = {
  tableName: "profiles",
  type: "user",
  selectFields: "id, full_name, email, username, role, active",
  searchColumns: ["full_name", "email", "username"],
  resultPath: "/admin/config/users",
  mapResult: (user): SearchResult => ({
    id: user.id,
    type: "user",
    title: user.full_name ?? user.username,
    subtitle: buildSubtitle(user.email, user.role),
    description: null, // No description for users
    path: "/admin/config/users",
    active: user.active,
    metadata: {
      email: user.email,
      role: user.role,
    },
  }),
};

/**
 * Issue search configuration
 * Uses !inner joins - issues must have operations with parts
 */
export const issueSearchConfig: EntitySearchConfig<IssueRow> = {
  tableName: "issues",
  type: "issue",
  // !inner: Issues must have operations with parts - excludes orphaned issues
  selectFields: `
    id,
    description,
    severity,
    status,
    resolution_notes,
    operations!inner(
      operation_name,
      parts!inner(part_number, jobs!inner(job_number))
    )
  `,
  searchColumns: ["description", "resolution_notes"],
  resultPath: "/admin/issues",
  mapResult: (issue): SearchResult => ({
    id: issue.id,
    type: "issue",
    title: issue.description, // null if no description - UI handles fallback
    subtitle: buildSubtitle(
      issue.severity,
      issue.operations?.operation_name
    ),
    description: issue.resolution_notes,
    path: "/admin/issues",
    status: issue.status ?? undefined,
    metadata: {
      operationName: issue.operations?.operation_name,
      partNumber: issue.operations?.parts?.part_number,
      jobNumber: issue.operations?.parts?.jobs?.job_number,
    },
  }),
};

/**
 * Resource search configuration
 */
export const resourceSearchConfig: EntitySearchConfig<ResourceRow> = {
  tableName: "resources",
  type: "resource",
  selectFields: "id, name, type, description, identifier, location, active",
  searchColumns: ["name", "type", "description", "identifier", "location"],
  resultPath: "/admin/config/resources",
  mapResult: (resource): SearchResult => ({
    id: resource.id,
    type: "resource",
    title: resource.name,
    subtitle: buildSubtitle(resource.type, resource.location),
    description: resource.description,
    path: "/admin/config/resources",
    active: resource.active,
    metadata: {
      resourceType: resource.type,
      location: resource.location ?? undefined,
      identifier: resource.identifier ?? undefined,
    },
  }),
};

/**
 * Material search configuration
 */
export const materialSearchConfig: EntitySearchConfig<MaterialRow> = {
  tableName: "materials",
  type: "material",
  selectFields: "id, name, description, color, active",
  searchColumns: ["name", "description"],
  resultPath: "/admin/config/materials",
  mapResult: (material): SearchResult => ({
    id: material.id,
    type: "material",
    title: material.name,
    subtitle: material.description, // null if no description - UI handles fallback
    description: null, // No additional description
    path: "/admin/config/materials",
    active: material.active,
    metadata: {
      color: material.color ?? undefined,
    },
  }),
};

/**
 * All search configurations mapped by type
 * Open for extension - add new configs here
 */
export const searchConfigs = {
  job: jobSearchConfig,
  part: partSearchConfig,
  operation: operationSearchConfig,
  user: userSearchConfig,
  issue: issueSearchConfig,
  resource: resourceSearchConfig,
  material: materialSearchConfig,
} as const;
