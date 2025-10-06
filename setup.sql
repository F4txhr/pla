-- =================================================================================
--  VPN Manager Supabase Setup
-- =================================================================================
--
--  This script will create the necessary table for the VPN Manager application
--  to run with a Supabase backend.
--
--  Instructions:
--  1. Log in to your Supabase project dashboard.
--  2. Navigate to the 'SQL Editor' section.
--  3. Click '+ New query' and paste the entire content of this file.
--  4. Click 'RUN' to execute the query and create the table.
--

-- Create the main table for storing application data.
-- This table mimics a key-value store, where 'key' is the unique identifier
-- for a piece of data (e.g., 'proxies', 'accounts') and 'value' stores the
-- corresponding JSON data.
CREATE TABLE public.app_data (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Optional: Add comments to the table and columns for clarity.
COMMENT ON TABLE public.app_data IS 'A key-value store for application settings and data.';
COMMENT ON COLUMN public.app_data.key IS 'The unique identifier for the data (e.g., proxies, accounts).';
COMMENT ON COLUMN public.app_data.value IS 'The JSON object or array containing the data.';