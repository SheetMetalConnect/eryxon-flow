-- Add full-text search indexes for better search performance
-- This migration adds GIN indexes and tsvector columns for PostgreSQL full-text search

-- Add tsvector columns for full-text search on jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(job_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(customer, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) STORED;

-- Create GIN index on jobs search vector
CREATE INDEX IF NOT EXISTS idx_jobs_search_vector ON jobs USING GIN (search_vector);

-- Add tsvector columns for full-text search on parts table
ALTER TABLE parts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(part_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(material, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) STORED;

-- Create GIN index on parts search vector
CREATE INDEX IF NOT EXISTS idx_parts_search_vector ON parts USING GIN (search_vector);

-- Add tsvector columns for full-text search on operations table
ALTER TABLE operations ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(operation_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) STORED;

-- Create GIN index on operations search vector
CREATE INDEX IF NOT EXISTS idx_operations_search_vector ON operations USING GIN (search_vector);

-- Add tsvector columns for full-text search on profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(email, '')), 'B')
  ) STORED;

-- Create GIN index on profiles search vector
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN (search_vector);

-- Add tsvector columns for full-text search on issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(resolution_notes, '')), 'B')
  ) STORED;

-- Create GIN index on issues search vector
CREATE INDEX IF NOT EXISTS idx_issues_search_vector ON issues USING GIN (search_vector);

-- Add additional indexes for common search patterns
-- These complement the existing indexes and improve search performance

-- Jobs: Additional index for combined job_number and customer search
CREATE INDEX IF NOT EXISTS idx_jobs_number_customer ON jobs (job_number, customer) WHERE tenant_id IS NOT NULL;

-- Parts: Additional index for combined part_number and material search
CREATE INDEX IF NOT EXISTS idx_parts_number_material ON parts (part_number, material) WHERE tenant_id IS NOT NULL;

-- Profiles: Additional index for email and username search
CREATE INDEX IF NOT EXISTS idx_profiles_email_username ON profiles (email, username) WHERE tenant_id IS NOT NULL;

-- Comment explaining the search indexes
COMMENT ON COLUMN jobs.search_vector IS 'Full-text search vector for jobs. Searches job_number (weight A), customer (weight A), and notes (weight B)';
COMMENT ON COLUMN parts.search_vector IS 'Full-text search vector for parts. Searches part_number (weight A), material (weight B), and notes (weight B)';
COMMENT ON COLUMN operations.search_vector IS 'Full-text search vector for operations. Searches operation_name (weight A) and notes (weight B)';
COMMENT ON COLUMN profiles.search_vector IS 'Full-text search vector for users. Searches full_name (weight A), username (weight A), and email (weight B)';
COMMENT ON COLUMN issues.search_vector IS 'Full-text search vector for issues. Searches description (weight A) and resolution_notes (weight B)';
