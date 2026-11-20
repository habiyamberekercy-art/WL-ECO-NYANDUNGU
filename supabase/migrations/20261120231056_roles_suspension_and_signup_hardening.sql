/*
# Roles, suspension enforcement and sign-up hardening

1. Modified Tables
- `profiles.role` now also allows `researcher` and `government` (in addition to admin, manager, public).
  `public` is the community user role.

2. Security
- Sign-up can no longer pick a role: `handle_new_user` always creates a `public` (community) profile.
  Previously a sign-up request could ask to be `admin`.
- Clients can no longer INSERT profiles directly (the sign-up trigger creates them), and anon loses
  UPDATE on profiles. Authenticated users keep UPDATE on full_name, organization, avatar_url only.
- Suspension is enforced by the auth server: when `profiles.suspended` becomes true the account is
  banned in `auth.users` (sign-in rejected, refresh tokens refused); clearing it lifts the ban.
- `admin_update_profile` accepts the two new roles.

3. Notes
1. Existing suspended accounts are banned immediately by the backfill at the end.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['admin','manager','public','researcher','government']));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'public')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE INSERT ON profiles FROM anon, authenticated;
REVOKE UPDATE ON profiles FROM anon;

CREATE OR REPLACE FUNCTION public.admin_update_profile(target_id uuid, new_role text, new_suspended boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND NOT p.suspended)
  INTO caller_is_admin;
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  IF new_role NOT IN ('admin', 'manager', 'public', 'researcher', 'government') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE profiles SET role = new_role, suspended = new_suspended WHERE id = target_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_suspension_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET banned_until = CASE WHEN NEW.suspended THEN 'infinity'::timestamptz ELSE NULL END
  WHERE id = NEW.id;
  IF NEW.suspended THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_suspension_ban() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_sync_suspension ON profiles;
CREATE TRIGGER profiles_sync_suspension
  AFTER INSERT OR UPDATE OF suspended ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_suspension_ban();

UPDATE auth.users u SET banned_until = 'infinity'::timestamptz
FROM profiles p WHERE p.id = u.id AND p.suspended;
