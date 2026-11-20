/*
# WL-ECO Wetland Monitoring Platform Schema

## Overview
Creates the complete database schema for a wetland monitoring and management platform with:
- User profiles with role-based access (admin, manager, public)
- Wetland sites with geographic coordinates and metadata
- Simulated sensor data (water level, pH, temperature, dissolved oxygen, turbidity)
- Public observation reports submitted by community members

## Tables

### profiles
- Extends auth.users with role-based access control
- `id` (uuid, PK, references auth.users)
- `email` (text)
- `full_name` (text)
- `role` (text: 'admin' | 'manager' | 'public', default 'public')
- `organization` (text, nullable)
- `created_at` (timestamptz)

### wetlands
- Wetland monitoring sites
- `id` (uuid, PK)
- `name` (text)
- `description` (text)
- `latitude` (numeric)
- `longitude` (numeric)
- `area_hectares` (numeric)
- `status` (text: 'healthy' | 'moderate' | 'degraded' | 'critical')
- `region` (text)
- `established_date` (date)
- `created_at` (timestamptz)

### sensor_data
- Time-series sensor readings per wetland
- `id` (uuid, PK)
- `wetland_id` (uuid, FK -> wetlands)
- `water_level_cm` (numeric)
- `ph_level` (numeric)
- `temperature_c` (numeric)
- `dissolved_oxygen_mgl` (numeric)
- `turbidity_ntu` (numeric)
- `recorded_at` (timestamptz)

### reports
- Public observation reports
- `id` (uuid, PK)
- `wetland_id` (uuid, FK -> wetlands, nullable for general reports)
- `reporter_name` (text)
- `reporter_email` (text)
- `report_type` (text: 'pollution' | 'wildlife' | 'flooding' | 'invasive_species' | 'other')
- `description` (text)
- `location_description` (text)
- `severity` (text: 'low' | 'medium' | 'high')
- `status` (text: 'pending' | 'reviewing' | 'resolved' | 'dismissed', default 'pending')
- `image_url` (text, nullable)
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables
- profiles: users can read/update own profile; admins/managers can read all
- wetlands: public read (anon + authenticated); admin/manager write
- sensor_data: public read; admin/manager write
- reports: public can submit (anon + authenticated insert); admin/manager can update status; authenticated can read all
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'manager', 'public')),
  organization text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "select_all_profiles_staff" ON profiles;
CREATE POLICY "select_all_profiles_staff" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Wetlands table
CREATE TABLE IF NOT EXISTS wetlands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  area_hectares numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'moderate', 'degraded', 'critical')),
  region text NOT NULL DEFAULT '',
  established_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wetlands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wetlands_public_read" ON wetlands;
CREATE POLICY "wetlands_public_read" ON wetlands FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wetlands_staff_insert" ON wetlands;
CREATE POLICY "wetlands_staff_insert" ON wetlands FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "wetlands_staff_update" ON wetlands;
CREATE POLICY "wetlands_staff_update" ON wetlands FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "wetlands_admin_delete" ON wetlands;
CREATE POLICY "wetlands_admin_delete" ON wetlands FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Sensor data table
CREATE TABLE IF NOT EXISTS sensor_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wetland_id uuid NOT NULL REFERENCES wetlands(id) ON DELETE CASCADE,
  water_level_cm numeric NOT NULL DEFAULT 0,
  ph_level numeric NOT NULL DEFAULT 7.0,
  temperature_c numeric NOT NULL DEFAULT 20.0,
  dissolved_oxygen_mgl numeric NOT NULL DEFAULT 8.0,
  turbidity_ntu numeric NOT NULL DEFAULT 5.0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sensor_public_read" ON sensor_data;
CREATE POLICY "sensor_public_read" ON sensor_data FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sensor_staff_insert" ON sensor_data;
CREATE POLICY "sensor_staff_insert" ON sensor_data FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "sensor_staff_delete" ON sensor_data;
CREATE POLICY "sensor_staff_delete" ON sensor_data FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wetland_id uuid REFERENCES wetlands(id) ON DELETE SET NULL,
  reporter_name text NOT NULL,
  reporter_email text NOT NULL DEFAULT '',
  report_type text NOT NULL CHECK (report_type IN ('pollution', 'wildlife', 'flooding', 'invasive_species', 'other')),
  description text NOT NULL,
  location_description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_public_read" ON reports;
CREATE POLICY "reports_public_read" ON reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reports_public_insert" ON reports;
CREATE POLICY "reports_public_insert" ON reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reports_staff_update" ON reports;
CREATE POLICY "reports_staff_update" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "reports_staff_delete" ON reports;
CREATE POLICY "reports_staff_delete" ON reports FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_wetland_id ON sensor_data(wetland_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_recorded_at ON sensor_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_reports_wetland_id ON reports(wetland_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_wetlands_status ON wetlands(status);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
