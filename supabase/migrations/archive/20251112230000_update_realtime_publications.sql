-- Update realtime publications for renamed tables
-- Since tasks was renamed to operations, update the publication

-- Remove old tasks table from realtime (it no longer exists)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS tasks;

-- Add operations table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE operations;

-- Ensure other tables are also in realtime
-- These may already exist, but IF NOT EXISTS isn't available for publications
-- So we use a different approach: drop and re-add

-- Note: The DROP TABLE IF EXISTS is safe and won't error if table isn't in publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS cells;
ALTER PUBLICATION supabase_realtime ADD TABLE cells;
