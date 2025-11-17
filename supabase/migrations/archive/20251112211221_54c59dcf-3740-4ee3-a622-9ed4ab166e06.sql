-- Clear all data except tenant information (profiles table)
-- Delete in correct order to respect foreign key constraints

DELETE FROM webhook_logs;
DELETE FROM time_entries;
DELETE FROM substeps;
DELETE FROM issues;
DELETE FROM assignments;
DELETE FROM operations;
DELETE FROM parts;
DELETE FROM jobs;
DELETE FROM webhooks;
DELETE FROM api_keys;
DELETE FROM cells;

-- Profiles table is preserved to keep tenant information