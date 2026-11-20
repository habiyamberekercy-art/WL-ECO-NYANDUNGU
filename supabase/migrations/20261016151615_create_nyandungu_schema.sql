/*
# WL-ECO Nyandungu Eco-Park Schema

## Overview
Creates the complete database schema for a wetland monitoring platform anchored on
the Nyandungu Eco-Park in Kigali, Rwanda. Includes park zones, pond sensors, 
wildlife observations, citizen incident reports, and system activity logs.

## Tables

### park_zones
- Ecological zones within Nyandungu Eco-Park
- id, name, zone_type, description, latitude, longitude, boundary_geojson, 
  ecological_status, image_url

### ponds
- The 8 catchment/recreational ponds in the park
- id, name, zone_id (FK), latitude, longitude, pond_type, surface_area_m2

### sensor_readings
- Time-series telemetry from IoT sensors across ponds and zones
- id, pond_id, zone_id, water_level_cm, ph_level, temperature_c, 
  pollution_index, dissolved_oxygen_mgl, turbidity_ntu, recorded_at

### wildlife_observations
- Historical wildlife species counts (bird species recovery tracking)
- id, observation_date, species_category, count, notes

### incident_reports
- Citizen-submitted environmental incident reports
- id, reporter_name, reporter_email, report_type, description, 
  location_zone_id, severity, status, image_url, created_at

### activity_logs
- Simulated system activity log entries
- id, event_type, message, created_at

## Security
- RLS enabled on all tables
- All tables allow anon+authenticated SELECT (public data)
- incident_reports: public INSERT, admin/officer UPDATE/DELETE
- sensor_readings, wildlife, activity_logs: staff INSERT
- park_zones, ponds: staff INSERT/UPDATE/DELETE
*/

-- Park Zones
CREATE TABLE IF NOT EXISTS park_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone_type text NOT NULL CHECK (zone_type IN ('savannah', 'woodland', 'garden', 'wetland', 'recreational')),
  description text NOT NULL DEFAULT '',
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  ecological_status text NOT NULL DEFAULT 'healthy' CHECK (ecological_status IN ('healthy', 'moderate', 'degraded', 'critical')),
  image_url text,
  area_hectares numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE park_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zones_public_read" ON park_zones;
CREATE POLICY "zones_public_read" ON park_zones FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "zones_staff_insert" ON park_zones;
CREATE POLICY "zones_staff_insert" ON park_zones FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "zones_staff_update" ON park_zones;
CREATE POLICY "zones_staff_update" ON park_zones FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "zones_admin_delete" ON park_zones;
CREATE POLICY "zones_admin_delete" ON park_zones FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Ponds
CREATE TABLE IF NOT EXISTS ponds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone_id uuid REFERENCES park_zones(id) ON DELETE SET NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  pond_type text NOT NULL DEFAULT 'catchment' CHECK (pond_type IN ('catchment', 'recreational', 'retention', 'filtration')),
  surface_area_m2 numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ponds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ponds_public_read" ON ponds;
CREATE POLICY "ponds_public_read" ON ponds FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ponds_staff_insert" ON ponds;
CREATE POLICY "ponds_staff_insert" ON ponds FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "ponds_staff_update" ON ponds;
CREATE POLICY "ponds_staff_update" ON ponds FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "ponds_admin_delete" ON ponds;
CREATE POLICY "ponds_admin_delete" ON ponds FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Sensor Readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id uuid REFERENCES ponds(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES park_zones(id) ON DELETE SET NULL,
  water_level_cm numeric NOT NULL DEFAULT 100,
  ph_level numeric NOT NULL DEFAULT 7.0,
  temperature_c numeric NOT NULL DEFAULT 22.0,
  pollution_index numeric NOT NULL DEFAULT 20,
  dissolved_oxygen_mgl numeric NOT NULL DEFAULT 8.0,
  turbidity_ntu numeric NOT NULL DEFAULT 5.0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sensors_public_read" ON sensor_readings;
CREATE POLICY "sensors_public_read" ON sensor_readings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sensors_staff_insert" ON sensor_readings;
CREATE POLICY "sensors_staff_insert" ON sensor_readings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "sensors_staff_delete" ON sensor_readings;
CREATE POLICY "sensors_staff_delete" ON sensor_readings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

-- Wildlife Observations
CREATE TABLE IF NOT EXISTS wildlife_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_date date NOT NULL,
  species_category text NOT NULL DEFAULT 'birds',
  species_count integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wildlife_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wildlife_public_read" ON wildlife_observations;
CREATE POLICY "wildlife_public_read" ON wildlife_observations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wildlife_staff_insert" ON wildlife_observations;
CREATE POLICY "wildlife_staff_insert" ON wildlife_observations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "wildlife_staff_delete" ON wildlife_observations;
CREATE POLICY "wildlife_staff_delete" ON wildlife_observations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

-- Incident Reports (citizen-submitted)
CREATE TABLE IF NOT EXISTS incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_name text NOT NULL,
  reporter_email text NOT NULL DEFAULT '',
  report_type text NOT NULL CHECK (report_type IN ('sewage_inflow', 'infrastructure_damage', 'illegal_grazing', 'pollution', 'wildlife_threat', 'other')),
  description text NOT NULL,
  location_zone_id uuid REFERENCES park_zones(id) ON DELETE SET NULL,
  location_description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_public_read" ON incident_reports;
CREATE POLICY "reports_public_read" ON incident_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reports_public_insert" ON incident_reports;
CREATE POLICY "reports_public_insert" ON incident_reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reports_staff_update" ON incident_reports;
CREATE POLICY "reports_staff_update" ON incident_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "reports_staff_delete" ON incident_reports;
CREATE POLICY "reports_staff_delete" ON incident_reports FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

-- Activity Logs (simulated system events)
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'system',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_public_read" ON activity_logs;
CREATE POLICY "logs_public_read" ON activity_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "logs_staff_insert" ON activity_logs;
CREATE POLICY "logs_staff_insert" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "logs_staff_delete" ON activity_logs;
CREATE POLICY "logs_staff_delete" ON activity_logs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sensor_pond_id ON sensor_readings(pond_id);
CREATE INDEX IF NOT EXISTS idx_sensor_recorded_at ON sensor_readings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON incident_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_wildlife_date ON wildlife_observations(observation_date);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at);
