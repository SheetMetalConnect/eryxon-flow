/**
 * Foreign Key Validation Utilities
 * Batch-fetch valid IDs from database for FK validation
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch valid IDs for a specific table
 */
export async function fetchValidIds(
  supabase: SupabaseClient,
  table: string,
  ids: (string | null | undefined)[],
  tenantId: string,
): Promise<string[]> {
  // Filter out null/undefined values and deduplicate
  const uniqueIds = [...new Set(ids.filter((id) => id))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", uniqueIds);

  if (error) {
    console.error(`Error fetching valid IDs from ${table}:`, error);
    throw new Error(`Failed to validate foreign keys for ${table}`);
  }

  return data?.map((row) => row.id) || [];
}

/**
 * Collect all foreign key IDs from nested job structure
 */
export function collectJobForeignKeys(jobData: any): {
  cellIds: string[];
  operatorIds: string[];
  materialIds: string[];
  resourceIds: string[];
} {
  const cellIds: Set<string> = new Set();
  const operatorIds: Set<string> = new Set();
  const materialIds: Set<string> = new Set();
  const resourceIds: Set<string> = new Set();

  // Job level
  if (jobData.current_cell_id) cellIds.add(jobData.current_cell_id);

  // Parts level
  if (jobData.parts && Array.isArray(jobData.parts)) {
    jobData.parts.forEach((part: any) => {
      if (part.current_cell_id) cellIds.add(part.current_cell_id);
      if (part.material_id) materialIds.add(part.material_id);

      // Operations level
      if (part.operations && Array.isArray(part.operations)) {
        part.operations.forEach((op: any) => {
          if (op.cell_id) cellIds.add(op.cell_id);
          if (op.assigned_operator_id) operatorIds.add(op.assigned_operator_id);

          // Resources
          if (op.resources && Array.isArray(op.resources)) {
            op.resources.forEach((res: any) => {
              if (res.resource_id) resourceIds.add(res.resource_id);
            });
          }
        });
      }
    });
  }

  return {
    cellIds: Array.from(cellIds),
    operatorIds: Array.from(operatorIds),
    materialIds: Array.from(materialIds),
    resourceIds: Array.from(resourceIds),
  };
}

/**
 * Collect foreign key IDs from part data
 */
export function collectPartForeignKeys(partData: any): {
  jobIds: string[];
  cellIds: string[];
  operatorIds: string[];
  materialIds: string[];
  resourceIds: string[];
  parentPartIds: string[];
} {
  const jobIds: Set<string> = new Set();
  const cellIds: Set<string> = new Set();
  const operatorIds: Set<string> = new Set();
  const materialIds: Set<string> = new Set();
  const resourceIds: Set<string> = new Set();
  const parentPartIds: Set<string> = new Set();

  if (partData.job_id) jobIds.add(partData.job_id);
  if (partData.current_cell_id) cellIds.add(partData.current_cell_id);
  if (partData.material_id) materialIds.add(partData.material_id);
  if (partData.parent_part_id) parentPartIds.add(partData.parent_part_id);

  // Operations
  if (partData.operations && Array.isArray(partData.operations)) {
    partData.operations.forEach((op: any) => {
      if (op.cell_id) cellIds.add(op.cell_id);
      if (op.assigned_operator_id) operatorIds.add(op.assigned_operator_id);

      if (op.resources && Array.isArray(op.resources)) {
        op.resources.forEach((res: any) => {
          if (res.resource_id) resourceIds.add(res.resource_id);
        });
      }
    });
  }

  return {
    jobIds: Array.from(jobIds),
    cellIds: Array.from(cellIds),
    operatorIds: Array.from(operatorIds),
    materialIds: Array.from(materialIds),
    resourceIds: Array.from(resourceIds),
    parentPartIds: Array.from(parentPartIds),
  };
}

/**
 * Collect foreign key IDs from operation data
 */
export function collectOperationForeignKeys(operationData: any): {
  partIds: string[];
  cellIds: string[];
  operatorIds: string[];
  resourceIds: string[];
} {
  const partIds: Set<string> = new Set();
  const cellIds: Set<string> = new Set();
  const operatorIds: Set<string> = new Set();
  const resourceIds: Set<string> = new Set();

  if (operationData.part_id) partIds.add(operationData.part_id);
  if (operationData.cell_id) cellIds.add(operationData.cell_id);
  if (operationData.assigned_operator_id) {
    operatorIds.add(operationData.assigned_operator_id);
  }

  if (operationData.resources && Array.isArray(operationData.resources)) {
    operationData.resources.forEach((res: any) => {
      if (res.resource_id) resourceIds.add(res.resource_id);
    });
  }

  return {
    partIds: Array.from(partIds),
    cellIds: Array.from(cellIds),
    operatorIds: Array.from(operatorIds),
    resourceIds: Array.from(resourceIds),
  };
}

/**
 * Collect foreign key IDs from issue/NCR data
 */
export function collectIssueForeignKeys(issueData: any): {
  operationIds: string[];
  userIds: string[];
  scrapReasonIds: string[];
} {
  const operationIds: Set<string> = new Set();
  const userIds: Set<string> = new Set();
  const scrapReasonIds: Set<string> = new Set();

  if (issueData.operation_id) operationIds.add(issueData.operation_id);
  if (issueData.reported_by_id) userIds.add(issueData.reported_by_id);
  if (issueData.resolved_by_id) userIds.add(issueData.resolved_by_id);
  if (issueData.verified_by_id) userIds.add(issueData.verified_by_id);

  return {
    operationIds: Array.from(operationIds),
    userIds: Array.from(userIds),
    scrapReasonIds: Array.from(scrapReasonIds),
  };
}
