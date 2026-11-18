-- Covering indexes for foreign keys the admin lists and dashboard join or filter on
-- (Supabase performance advisor: unindexed_foreign_keys).
CREATE INDEX IF NOT EXISTS idx_assignments_job_id ON public.assignments (job_id);
CREATE INDEX IF NOT EXISTS idx_assignments_part_id ON public.assignments (part_id);
CREATE INDEX IF NOT EXISTS idx_issues_reported_by_id ON public.issues (reported_by_id);
CREATE INDEX IF NOT EXISTS idx_issues_current_cell_id ON public.issues (current_cell_id);
CREATE INDEX IF NOT EXISTS idx_issues_intended_next_cell_id ON public.issues (intended_next_cell_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_shop_floor_operator_id ON public.time_entries (shop_floor_operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_operator_id ON public.operator_sessions (operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_tenant_id ON public.operator_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_part_placements_location_id ON public.part_placements (location_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_cell_id ON public.storage_locations (cell_id);
CREATE INDEX IF NOT EXISTS idx_resource_cell_memberships_cell_id ON public.resource_cell_memberships (cell_id);
CREATE INDEX IF NOT EXISTS idx_resource_cell_memberships_resource_id ON public.resource_cell_memberships (resource_id);
CREATE INDEX IF NOT EXISTS idx_factory_holidays_tenant_id ON public.factory_holidays (tenant_id);
CREATE INDEX IF NOT EXISTS idx_factory_shifts_tenant_id ON public.factory_shifts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_entries_shift_id ON public.attendance_entries (shift_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_tenant_id ON public.profiles (active_tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON public.api_usage_logs (api_key_id);
