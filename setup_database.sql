-- ===================================================================
-- Griever — Supabase Database Setup
-- Run this entire script in the Supabase SQL Editor (one-time setup)
-- ===================================================================

-- 1. Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Create grievances table
CREATE TABLE IF NOT EXISTS grievances (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL,
  name text NOT NULL,
  email text DEFAULT '',
  department text DEFAULT '',
  description text NOT NULL,
  status text DEFAULT 'Pending',
  admin_response text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Seed default admin account
INSERT INTO admins (username, password)
VALUES ('Admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- 4. Enable RLS with permissive policies
--    (allows the anon/publishable key full access)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to admins"
  ON admins FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to grievances"
  ON grievances FOR ALL
  USING (true)
  WITH CHECK (true);
