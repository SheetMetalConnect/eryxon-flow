/**
 * Search Configurations
 *
 * Defines search behavior for each entity type.
 * Open/Closed Principle - add new entities by adding configs, not modifying code.
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
  jobs: { job_number: string; customer: string | null } | null;
}

interface OperationRow {
  id: string;
  operation_name: string;
  status: string | null;
  notes: string | null;
  parts: {
    part_number: string;
    jobs: { job_number: string; customer: string | null } | null;
  } | null;
  cells: { name: string } | null;
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
 * Job search configuration
 */
export const jobSearchConfig: EntitySearchConfig<JobRow> = {
  tableName: "jobs",
  type: "job",
  selectFields:
    "id, job_number, customer, due_date, due_date_override, status, notes",
  searchColumns: ["job_number", "customer", "notes"],
  resultPath: "/admin/jobs",
  mapResult: (job) => ({
    id: job.id,
    type: "job",
    title: `JOB-${job.job_number}`,
    subtitle: job.customer || "No customer",
    description: job.notes || undefined,
    path: "/admin/jobs",
    status: job.status || "not_started",
    metadata: {
      jobNumber: job.job_number,
      customer: job.customer || undefined,
      dueDate: job.due_date_override || job.due_date || undefined,
    },
  }),
};

/**
 * Part search configuration
 */
export const partSearchConfig: EntitySearchConfig<PartRow> = {
  tableName: "parts",
  type: "part",
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
  mapResult: (part) => ({
    id: part.id,
    type: "part",
    title: `Part #${part.part_number}`,
    subtitle: `${part.material || "No material"} • JOB-${part.jobs?.job_number || "N/A"}`,
    description: part.notes || undefined,
    path: "/admin/parts",
    status: part.status || "not_started",
    metadata: {
      partNumber: part.part_number,
      material: part.material || undefined,
      jobNumber: part.jobs?.job_number,
      customer: part.jobs?.customer || undefined,
    },
  }),
};

/**
 * Operation search configuration
 */
export const operationSearchConfig: EntitySearchConfig<OperationRow> = {
  tableName: "operations",
  type: "operation",
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
  mapResult: (op) => ({
    id: op.id,
    type: "operation",
    title: op.operation_name,
    subtitle: `Part #${op.parts?.part_number || "N/A"} • ${op.cells?.name || "No Cell"}`,
    description: op.notes || undefined,
    path: "/admin/assignments",
    status: op.status || "not_started",
    metadata: {
      operationName: op.operation_name,
      partNumber: op.parts?.part_number,
      jobNumber: op.parts?.jobs?.job_number,
      cellName: op.cells?.name,
      assignedTo: op.profiles?.full_name || op.profiles?.email,
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
  mapResult: (user) => ({
    id: user.id,
    type: "user",
    title: user.full_name || user.username,
    subtitle: `${user.email} • ${user.role}`,
    description: user.active ? "Active" : "Inactive",
    path: "/admin/config/users",
    metadata: {
      email: user.email,
      role: user.role,
    },
  }),
};

/**
 * Issue search configuration
 */
export const issueSearchConfig: EntitySearchConfig<IssueRow> = {
  tableName: "issues",
  type: "issue",
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
  mapResult: (issue) => ({
    id: issue.id,
    type: "issue",
    title: issue.description || "Untitled Issue",
    subtitle: `${issue.severity} severity • ${issue.operations?.operation_name || "N/A"}`,
    description: issue.resolution_notes || undefined,
    path: "/admin/issues",
    status: issue.status || "open",
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
  mapResult: (resource) => ({
    id: resource.id,
    type: "resource",
    title: resource.name,
    subtitle: `${resource.type}${resource.location ? ` • ${resource.location}` : ""}`,
    description: resource.description || undefined,
    path: "/admin/config/resources",
    status: resource.active ? "active" : "inactive",
    metadata: {
      resourceType: resource.type,
      location: resource.location || undefined,
      identifier: resource.identifier || undefined,
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
  mapResult: (material) => ({
    id: material.id,
    type: "material",
    title: material.name,
    subtitle: material.description || "No description",
    description: material.active ? "Active" : "Inactive",
    path: "/admin/config/materials",
    status: material.active ? "active" : "inactive",
    metadata: {
      color: material.color || undefined,
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
