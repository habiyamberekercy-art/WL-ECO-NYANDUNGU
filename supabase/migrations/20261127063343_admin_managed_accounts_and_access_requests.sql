/*
# Admin-managed accounts and access requests

1. Plain-English summary
- People can no longer create their own accounts. Only an administrator can create an account
  (through the secure `admin-users` server function). Anyone else who tries to sign up is rejected
  by the database.
- Visitors can instead submit an "access request". Admins review requests and either approve
  them (which creates the account) or decline them.
- Accounts created by an admin start with a temporary password and must set a new password on
  first sign-in.

2. New Tables
- `access_requests`
  - `id` (uuid, pk)
  - `full_name` (text) - requester's name
  - `email` (text) - requester's email
  - `organization` (text) - optional organisation / department
  - `reason` (text) - why access is needed
  - `status` (text) - pending | approved | declined (always starts as pending)
  - `reviewed_by` (uuid -> profiles) - admin who handled it
  - `reviewed_at` (timestamptz)
  - `created_at` (timestamptz)

3. Modified Tables
- `profiles.must_change_password` (boolean, default false) - true for accounts given a temporary
  password by an admin; cleared after the user chooses their own password.

4. Security
- `access_requests`: RLS on. Anyone (anon/authenticated) may INSERT, but only the name, email,
  organization and reason columns, and status must be 'pending'. Only active admins may SELECT.
  No client UPDATE/DELETE: reviewing happens in the server function (service_role).
- `handle_new_user` now refuses any new auth user whose app metadata (settable only by the
  server) is not flagged `created_by_admin`. Role and organization also come from app metadata.
- `complete_password_change()` lets a signed-in user clear only their own must_change_password flag.

5. Notes
1. Existing accounts are unaffected (must_change_password defaults to false).
*/

CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organization text NOT NULL DEFAULT '' CHECK (char_length(organization) <= 160),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_requests_status_created_idx ON access_requests (status, created_at DESC);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON access_requests FROM anon, authenticated;
GRANT INSERT (full_name, email, organization, reason) ON access_requests TO anon, authenticated;
GRANT SELECT ON access_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON access_requests TO service_role;

DROP POLICY IF EXISTS "Anyone can submit an access request" ON access_requests;
CREATE POLICY "Anyone can submit an access request"
  ON access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

DROP POLICY IF EXISTS "Admins can view access requests" ON access_requests;
CREATE POLICY "Admins can view access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND NOT p.suspended));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE ON profiles TO service_role;
GRANT INSERT ON audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF COALESCE(NEW.raw_app_meta_data->>'created_by_admin', 'false') <> 'true' THEN
    RAISE EXCEPTION 'Self sign-up is disabled. Accounts are created by an administrator.'
      USING ERRCODE = '42501';
  END IF;

  v_role := COALESCE(NEW.raw_app_meta_data->>'role', 'public');
  IF v_role NOT IN ('admin', 'manager', 'public', 'researcher', 'government') THEN
    v_role := 'public';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    NULLIF(NEW.raw_app_meta_data->>'organization', ''),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET must_change_password = false WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;
