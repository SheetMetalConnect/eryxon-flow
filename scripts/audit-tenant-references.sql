-- Read-only audit before validating upgraded tenant relationships.
-- Nonzero counts require record-specific repair; no data is silently moved.
SELECT * FROM (
SELECT 'parts.job_id' AS relationship, count(*) AS mismatched_rows
FROM public.parts child JOIN public.jobs parent ON parent.id = child.job_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'parts.parent_part_id' AS relationship, count(*) AS mismatched_rows
FROM public.parts child JOIN public.parts parent ON parent.id = child.parent_part_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operations.part_id' AS relationship, count(*) AS mismatched_rows
FROM public.operations child JOIN public.parts parent ON parent.id = child.part_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operations.cell_id' AS relationship, count(*) AS mismatched_rows
FROM public.operations child JOIN public.cells parent ON parent.id = child.cell_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operations.assigned_operator_id' AS relationship, count(*) AS mismatched_rows
FROM public.operations child JOIN public.profiles parent ON parent.id = child.assigned_operator_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'assignments.job_id' AS relationship, count(*) AS mismatched_rows
FROM public.assignments child JOIN public.jobs parent ON parent.id = child.job_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'assignments.part_id' AS relationship, count(*) AS mismatched_rows
FROM public.assignments child JOIN public.parts parent ON parent.id = child.part_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'assignments.operator_id' AS relationship, count(*) AS mismatched_rows
FROM public.assignments child JOIN public.profiles parent ON parent.id = child.operator_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'assignments.shop_floor_operator_id' AS relationship, count(*) AS mismatched_rows
FROM public.assignments child JOIN public.operators parent ON parent.id = child.shop_floor_operator_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'substeps.operation_id' AS relationship, count(*) AS mismatched_rows
FROM public.substeps child JOIN public.operations parent ON parent.id = child.operation_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_quantities.operation_id' AS relationship, count(*) AS mismatched_rows
FROM public.operation_quantities child JOIN public.operations parent ON parent.id = child.operation_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_quantities.scrap_reason_id' AS relationship, count(*) AS mismatched_rows
FROM public.operation_quantities child JOIN public.scrap_reasons parent ON parent.id = child.scrap_reason_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_batches.cell_id' AS relationship, count(*) AS mismatched_rows
FROM public.operation_batches child JOIN public.cells parent ON parent.id = child.cell_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_batches.parent_batch_id' AS relationship, count(*) AS mismatched_rows
FROM public.operation_batches child JOIN public.operation_batches parent ON parent.id = child.parent_batch_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'batch_operations.batch_id' AS relationship, count(*) AS mismatched_rows
FROM public.batch_operations child JOIN public.operation_batches parent ON parent.id = child.batch_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'batch_operations.operation_id' AS relationship, count(*) AS mismatched_rows
FROM public.batch_operations child JOIN public.operations parent ON parent.id = child.operation_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'batch_requirements.batch_id' AS relationship, count(*) AS mismatched_rows
FROM public.batch_requirements child JOIN public.operation_batches parent ON parent.id = child.batch_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'time_entries.operation_id' AS relationship, count(*) AS mismatched_rows
FROM public.time_entries child JOIN public.operations parent ON parent.id = child.operation_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'time_entries.operator_id' AS relationship, count(*) AS mismatched_rows
FROM public.time_entries child JOIN public.profiles parent ON parent.id = child.operator_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'storage_locations.cell_id' AS relationship, count(*) AS mismatched_rows
FROM public.storage_locations child JOIN public.cells parent ON parent.id = child.cell_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'part_placements.part_id' AS relationship, count(*) AS mismatched_rows
FROM public.part_placements child JOIN public.parts parent ON parent.id = child.part_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'part_placements.location_id' AS relationship, count(*) AS mismatched_rows
FROM public.part_placements child JOIN public.storage_locations parent ON parent.id = child.location_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'part_placements.operation_id' AS relationship, count(*) AS mismatched_rows
FROM public.part_placements child JOIN public.operations parent ON parent.id = child.operation_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'issues.operation_id' AS relationship, count(*) AS mismatched_rows
FROM public.issues child JOIN public.operations parent ON parent.id = child.operation_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_batches.created_by' AS relationship, count(*) AS mismatched_rows
FROM public.operation_batches child JOIN public.profiles parent ON parent.id = child.created_by
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_batches.started_by' AS relationship, count(*) AS mismatched_rows
FROM public.operation_batches child JOIN public.profiles parent ON parent.id = child.started_by
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'operation_batches.completed_by' AS relationship, count(*) AS mismatched_rows
FROM public.operation_batches child JOIN public.profiles parent ON parent.id = child.completed_by
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'assignments.assigned_by' AS relationship, count(*) AS mismatched_rows
FROM public.assignments child JOIN public.profiles parent ON parent.id = child.assigned_by
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'issues.created_by' AS relationship, count(*) AS mismatched_rows
FROM public.issues child JOIN public.profiles parent ON parent.id = child.created_by
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'issues.reported_by_id' AS relationship, count(*) AS mismatched_rows
FROM public.issues child JOIN public.profiles parent ON parent.id = child.reported_by_id
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
UNION ALL
SELECT 'issues.reviewed_by' AS relationship, count(*) AS mismatched_rows
FROM public.issues child JOIN public.profiles parent ON parent.id = child.reviewed_by
WHERE child.tenant_id IS DISTINCT FROM parent.tenant_id
) audit WHERE mismatched_rows > 0 ORDER BY relationship;
