-- Test connection migration
-- This migration is used to test the connection to the remote database

-- Create a simple test table
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a test record
INSERT INTO connection_test (test_name) VALUES ('Supabase CLI connection test');

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_connection_test_name ON connection_test(test_name);

-- Add a comment to the table
COMMENT ON TABLE connection_test IS 'Test table for verifying Supabase CLI connection';
