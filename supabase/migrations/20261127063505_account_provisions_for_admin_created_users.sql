/*
# Pre-approved account provisioning

1. Plain-English summary
- Admin account creation now works by first writing a short-lived "pre-approval" for the email
  address, then creating the login. The sign-up check only lets a new login through if a matching
  pre-approval exists, and uses it once. Self sign-ups still fail.

2. New Tables
- `account_provisions`
  - `email` (text, pk, lower-case) - address an admin approved
  - `full_name` (text), `role` (text), `organization` (text)
  - `created_by` (uuid -> profiles) - approving admin
  - `created_at` (timestamptz)

3. Security
- RLS enabled with NO policies and no grants to anon/authenticated: only the server
  (service_role) can read or write it.
- `handle_new_user` consumes the matching provision row (DELETE ... RETURNING) and raises an
  error when none exists.
*/

CREATE TABLE IF NOT EXISTS account_provisions (
  email text PRIMARY KEY CHECK (email = lower(email)),
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'manager', 'public', 'researcher', 'government')),
  organization text NOT NULL DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE account_provisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_provisions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON account_provisions TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prov account_provisions%ROWTYPE;
BEGIN
  DELETE FROM account_provisions
  WHERE email = lower(NEW.email) AND created_at > now() - interval '15 minutes'
  RETURNING * INTO v_prov;

  IF v_prov.email IS NULL THEN
    RAISE EXCEPTION 'Self sign-up is disabled. Accounts are created by an administrator.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization, must_change_password)
  VALUES (NEW.id, NEW.email, v_prov.full_name, v_prov.role, NULLIF(v_prov.organization, ''), true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
