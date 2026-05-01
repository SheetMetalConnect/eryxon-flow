import { supabase } from "@/integrations/supabase/client";

export async function fetchChildParts(parentPartId: string, tenantId: string) {
  const { data, error } = await supabase
    .from("parts")
    .select(`
      *,
      job:jobs(job_number, customer),
      operations:operations(id, status, operation_name)
    `)
    .eq("parent_part_id", parentPartId)
    .eq("tenant_id", tenantId)
    .order("part_number");

  if (error) throw error;
  return data || [];
}

export async function fetchParentPart(partId: string, tenantId: string) {
  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("parent_part_id")
    .eq("id", partId)
    .eq("tenant_id", tenantId)
    .single();

  if (partError) throw partError;
  if (!part?.parent_part_id) return null;

  const { data: parentPart, error: parentError } = await supabase
    .from("parts")
    .select(`
      *,
      job:jobs(job_number, customer),
      operations:operations(id, status, operation_name)
    `)
    .eq("id", part.parent_part_id)
    .eq("tenant_id", tenantId)
    .single();

  if (parentError) throw parentError;
  return parentPart;
}

export async function checkChildPartsCompletion(parentPartId: string, tenantId: string) {
  const { data: childParts, error } = await supabase
    .from("parts")
    .select("id, part_number, status")
    .eq("parent_part_id", parentPartId)
    .eq("tenant_id", tenantId);

  if (error) throw error;
  if (!childParts || childParts.length === 0) {
    return { hasChildren: false, allCompleted: true, incompleteChildren: [] as { id: string; part_number: string; status: string }[] };
  }

  const incompleteChildren = childParts.filter(p => p.status !== "completed");
  const allCompleted = incompleteChildren.length === 0;

  return {
    hasChildren: true,
    allCompleted,
    incompleteChildren,
    totalChildren: childParts.length,
    completedChildren: childParts.length - incompleteChildren.length,
  };
}

export async function checkAssemblyDependencies(partId: string, tenantId: string) {
  const childrenStatus = await checkChildPartsCompletion(partId, tenantId);

  return {
    hasDependencies: childrenStatus.hasChildren,
    dependenciesMet: childrenStatus.allCompleted,
    warnings: childrenStatus.incompleteChildren.map(child => ({
      partId: child.id,
      partNumber: child.part_number,
      status: child.status,
      message: `Child part ${child.part_number} is not yet completed (${child.status})`
    }))
  };
}
