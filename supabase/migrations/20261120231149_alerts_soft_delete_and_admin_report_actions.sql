/*
# Water-quality alerts, report soft-delete and admin-only report actions

1. New Tables
- `alert_thresholds` - safe range per sensor metric
  - `metric` (text, pk) e.g. ph_level, turbidity_ntu
  - `label`, `unit` (text)
  - `min_value`, `max_value` (numeric, nullable = no bound on that side)
  Seeded: pH 6.5-8.5, turbidity max 10 NTU. Temperature intentionally has no threshold.
- `alerts` - active/resolved alerts
  - `id` (uuid pk), `source` ('sensor' | 'report')
  - `metric`, `value`, `threshold_min`, `threshold_max` (sensor alerts)
  - `reading_id` -> sensor_readings, `pond_id` -> ponds, `zone_id` -> park_zones, `report_id` -> incident_reports
  - `severity` (low|medium|high), `message`
  - `status` ('active' | 'resolved'), `resolved_at`, `resolved_by` -> profiles, `resolution_note`
  - `created_at`

2. Modified Tables
- `incident_reports`: new `deleted_at` (timestamptz) and `deleted_by` (uuid -> profiles) for soft delete.

3. Automation
- After each new sensor reading, any metric outside its threshold creates an active alert (same transaction).
- Each new incident report creates an active linked alert. Existing open reports are backfilled.

4. Security
- `alerts`, `alert_thresholds`: RLS on, public read-only (water-quality status is public information).
  No client write grants; rows are written only by triggers and admin functions.
- `incident_reports`: hidden from everyone once soft-deleted. Clients lose UPDATE and DELETE entirely;
  INSERT is limited to report content columns (no status / deletion columns).
- `admin_set_report_status` and `admin_delete_report` (SECURITY DEFINER) re-check that the actor is an
  active admin and run each change plus its audit entry in one transaction. Only `service_role`
  (the report-admin edge function) may execute them.
*/

CREATE TABLE IF NOT EXISTS alert_thresholds (
  metric text PRIMARY KEY,
  label text NOT NULL,
  unit text NOT NULL DEFAULT '',
  min_value numeric,
  max_value numeric
);

INSERT INTO alert_thresholds (metric, label, unit, min_value, max_value) VALUES
  ('ph_level', 'pH', '', 6.5, 8.5),
  ('turbidity_ntu', 'Turbidity', 'NTU', NULL, 10)
ON CONFLICT (metric) DO NOTHING;

ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON alert_thresholds TO anon, authenticated;
DROP POLICY IF EXISTS "Thresholds are public" ON alert_thresholds;
CREATE POLICY "Thresholds are public" ON alert_thresholds FOR SELECT TO anon, authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incident_reports' AND column_name='deleted_at') THEN
    ALTER TABLE incident_reports ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incident_reports' AND column_name='deleted_by') THEN
    ALTER TABLE incident_reports ADD COLUMN deleted_by uuid REFERENCES profiles(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('sensor', 'report')),
  metric text,
  value numeric,
  threshold_min numeric,
  threshold_max numeric,
  reading_id uuid REFERENCES sensor_readings(id) ON DELETE SET NULL,
  pond_id uuid REFERENCES ponds(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES park_zones(id) ON DELETE SET NULL,
  report_id uuid REFERENCES incident_reports(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_status_created_idx ON alerts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_report_id_idx ON alerts (report_id);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON alerts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON alerts TO service_role;
DROP POLICY IF EXISTS "Alerts are public" ON alerts;
CREATE POLICY "Alerts are public" ON alerts FOR SELECT TO anon, authenticated USING (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_threshold_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  v numeric;
  pond_name text;
BEGIN
  SELECT name INTO pond_name FROM ponds WHERE id = NEW.pond_id;
  FOR t IN SELECT * FROM alert_thresholds LOOP
    v := CASE t.metric
      WHEN 'ph_level' THEN NEW.ph_level
      WHEN 'turbidity_ntu' THEN NEW.turbidity_ntu
      WHEN 'temperature_c' THEN NEW.temperature_c
      WHEN 'dissolved_oxygen_mgl' THEN NEW.dissolved_oxygen_mgl
      WHEN 'water_level_cm' THEN NEW.water_level_cm
      WHEN 'pollution_index' THEN NEW.pollution_index
    END;
    IF v IS NOT NULL AND ((t.min_value IS NOT NULL AND v < t.min_value) OR (t.max_value IS NOT NULL AND v > t.max_value)) THEN
      INSERT INTO alerts (source, metric, value, threshold_min, threshold_max, reading_id, pond_id, zone_id, severity, message)
      VALUES (
        'sensor', t.metric, v, t.min_value, t.max_value, NEW.id, NEW.pond_id, NEW.zone_id, 'high',
        format('%s %s at %s is outside the safe range (%s)',
          t.label, trim(both ' ' from v::text || ' ' || t.unit), COALESCE(pond_name, 'sensor'),
          CASE
            WHEN t.min_value IS NOT NULL AND t.max_value IS NOT NULL THEN t.min_value || '-' || t.max_value
            WHEN t.max_value IS NOT NULL THEN 'max ' || t.max_value
            ELSE 'min ' || t.min_value
          END || CASE WHEN t.unit <> '' THEN ' ' || t.unit ELSE '' END)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_threshold_alerts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sensor_readings_threshold_alerts ON sensor_readings;
CREATE TRIGGER sensor_readings_threshold_alerts
  AFTER INSERT ON sensor_readings
  FOR EACH ROW EXECUTE FUNCTION public.create_threshold_alerts();

CREATE OR REPLACE FUNCTION public.create_report_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO alerts (source, report_id, zone_id, severity, message)
  VALUES ('report', NEW.id, NEW.location_zone_id, NEW.severity,
          format('New %s-severity %s report awaiting review', NEW.severity, replace(NEW.report_type, '_', ' ')));
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_report_alert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS incident_reports_create_alert ON incident_reports;
CREATE TRIGGER incident_reports_create_alert
  AFTER INSERT ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.create_report_alert();

INSERT INTO alerts (source, report_id, zone_id, severity, message, created_at)
SELECT 'report', r.id, r.location_zone_id, r.severity,
       format('New %s-severity %s report awaiting review', r.severity, replace(r.report_type, '_', ' ')),
       r.created_at
FROM incident_reports r
WHERE r.status IN ('pending', 'investigating')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.report_id = r.id);

-- Reports: hide soft-deleted rows, remove direct client edits
DROP POLICY IF EXISTS "reports_public_read" ON incident_reports;
CREATE POLICY "reports_public_read" ON incident_reports FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "reports_staff_update" ON incident_reports;
DROP POLICY IF EXISTS "reports_staff_delete" ON incident_reports;

REVOKE UPDATE, DELETE ON incident_reports FROM anon, authenticated;
REVOKE INSERT ON incident_reports FROM anon, authenticated;
GRANT INSERT (reporter_name, reporter_email, report_type, description, location_zone_id, location_description, severity, image_url)
  ON incident_reports TO anon, authenticated;
GRANT SELECT, UPDATE ON incident_reports TO service_role;
GRANT INSERT ON audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_report_status(p_report_id uuid, p_status text, p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r incident_reports%ROWTYPE;
  resolved_count int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND NOT suspended) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'investigating', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO r FROM incident_reports WHERE id = p_report_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE incident_reports SET status = p_status WHERE id = p_report_id;

  IF p_status IN ('resolved', 'dismissed') THEN
    UPDATE alerts
    SET status = 'resolved', resolved_at = now(), resolved_by = p_actor,
        resolution_note = format('Linked report marked %s', p_status)
    WHERE report_id = p_report_id AND status = 'active';
    GET DIAGNOSTICS resolved_count = ROW_COUNT;
  END IF;

  INSERT INTO audit_logs (actor_id, event_type, message, metadata)
  VALUES (p_actor, 'report_status',
          format('Report %s status changed from %s to %s', left(p_report_id::text, 8), r.status, p_status),
          jsonb_build_object('report_id', p_report_id, 'old_status', r.status, 'new_status', p_status, 'alerts_resolved', resolved_count));

  RETURN jsonb_build_object('report_id', p_report_id, 'old_status', r.status, 'status', p_status, 'alerts_resolved', resolved_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_report(p_report_id uuid, p_actor uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_count int := 0;
  deleted_time timestamptz := now();
  note text := COALESCE(NULLIF(trim(p_note), ''), 'Linked report deleted by administrator');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND NOT suspended) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM incident_reports WHERE id = p_report_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE incident_reports SET deleted_at = deleted_time, deleted_by = p_actor WHERE id = p_report_id;

  UPDATE alerts
  SET status = 'resolved', resolved_at = deleted_time, resolved_by = p_actor, resolution_note = note
  WHERE report_id = p_report_id AND status = 'active';
  GET DIAGNOSTICS resolved_count = ROW_COUNT;

  INSERT INTO audit_logs (actor_id, event_type, message, metadata)
  VALUES (p_actor, 'report_delete',
          format('Report %s deleted (hidden); %s linked alert(s) resolved', left(p_report_id::text, 8), resolved_count),
          jsonb_build_object('report_id', p_report_id, 'deleted_at', deleted_time, 'alerts_resolved', resolved_count, 'note', note));

  RETURN jsonb_build_object('report_id', p_report_id, 'deleted_at', deleted_time, 'deleted_by', p_actor, 'alerts_resolved', resolved_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_report_status(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_report(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_report_status(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_report(uuid, uuid, text) TO service_role;
