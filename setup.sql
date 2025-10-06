-- =================================================================
--  Supabase Database Setup Script for VPN Manager
-- =================================================================
--  Instructions:
--  1. Navigate to the "SQL Editor" in your Supabase project dashboard.
--  2. Click on "+ New query".
--  3. Paste the entire content of this script into the editor.
--  4. Click "RUN" to execute the script.
-- =================================================================

-- -----------------------------------------------------------------
--  Table 1: proxies
--  Stores the list of all proxy servers.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    -- Using TEXT as a flexible type for various proxy formats (IP:PORT, user:pass@IP:PORT)
    proxy_data TEXT NOT NULL UNIQUE,
    -- 'status' can be 'online', 'offline', 'unchecked', etc.
    status VARCHAR(50) DEFAULT 'unchecked' NOT NULL,
    -- The latency of the proxy in milliseconds
    latency INT DEFAULT 0,
    -- The timestamp of the last health check
    last_checked TIMESTAMPTZ,
    -- Automatically record when the proxy was added
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add a comment to describe the table's purpose
COMMENT ON TABLE proxies IS 'Stores the list and status of all proxy servers.';


-- -----------------------------------------------------------------
--  Table 2: accounts
--  Stores user account data for the VPN service.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    -- A unique username for the account
    username VARCHAR(255) NOT NULL UNIQUE,
    -- A placeholder for a password or secret key
    secret_key TEXT,
    -- To enable or disable accounts easily
    is_active BOOLEAN DEFAULT true NOT NULL,
    -- Automatically record when the account was created
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add a comment to describe the table's purpose
COMMENT ON TABLE accounts IS 'Stores user accounts for accessing the VPN service.';


-- -----------------------------------------------------------------
--  Table 3: tunnels
--  Stores tunnel or subscription configuration data.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tunnels (
    id SERIAL PRIMARY KEY,
    -- A descriptive name for the tunnel configuration
    name VARCHAR(255) NOT NULL,
    -- The domain or endpoint associated with the tunnel
    domain TEXT,
    -- To enable or disable tunnels easily
    is_active BOOLEAN DEFAULT true NOT NULL,
    -- Automatically record when the tunnel was created
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add a comment to describe the table's purpose
COMMENT ON TABLE tunnels IS 'Stores tunnel or VPN subscription configurations.';


-- -----------------------------------------------------------------
--  Table 4: metadata
--  A simple key-value store for general application data.
--  This replaces the APP_DATA KV namespace.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metadata (
    -- The key for the data (e.g., 'last_updated_timestamp')
    key VARCHAR(255) PRIMARY KEY,
    -- The value associated with the key
    value JSONB,
    -- Automatically record when the metadata was last modified
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add a comment to describe the table's purpose
COMMENT ON TABLE metadata IS 'A key-value store for application-wide metadata.';

-- -----------------------------------------------------------------
--  Setup RLS (Row Level Security)
--  Enable RLS for all tables to ensure data is secure by default.
--  For this application, we will allow public read-only access
--  since there is no user authentication yet.
--  IMPORTANT: In a real production app with users, you would define
--  more restrictive policies.
-- -----------------------------------------------------------------
ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tunnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access (anon key can SELECT)
CREATE POLICY "Allow public read access" ON proxies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON accounts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON tunnels FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON metadata FOR SELECT USING (true);

-- For a simple admin dashboard, we can also allow anon key to modify data.
-- WARNING: This is NOT secure for a public-facing application.
-- This should be replaced with authenticated policies if user roles are added.
CREATE POLICY "Allow full access for admin" ON proxies FOR ALL USING (true);
CREATE POLICY "Allow full access for admin" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow full access for admin" ON tunnels FOR ALL USING (true);
CREATE POLICY "Allow full access for admin" ON metadata FOR ALL USING (true);

-- =================================================================
--  Updates for existing schemas
--  Run these commands if you have already set up the tables
--  and need to add the new columns for proxy testing.
-- =================================================================
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS latency INT DEFAULT 0;
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;

-- =================================================================
--  End of Script
-- =================================================================
-- You should now have four new tables in your database:
-- proxies, accounts, tunnels, and metadata.
-- =================================================================