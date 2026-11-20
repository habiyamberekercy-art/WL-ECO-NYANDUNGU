/*
# Use a concrete far-future ban date for suspended accounts

1. Changes
- `sync_suspension_ban` now sets `auth.users.banned_until` to 2999-12-31 instead of 'infinity'.
  The auth server cannot parse 'infinity' and returned a 500 instead of a clean "user is banned" rejection.
- Existing suspended accounts are updated to the same date.

2. Security
- No grant or policy changes. Suspended users remain unable to sign in.
*/

CREATE OR REPLACE FUNCTION public.sync_suspension_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET banned_until = CASE WHEN NEW.suspended THEN '2999-12-31 00:00:00+00'::timestamptz ELSE NULL END
  WHERE id = NEW.id;
  IF NEW.suspended THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_suspension_ban() FROM PUBLIC, anon, authenticated;

UPDATE auth.users u SET banned_until = '2999-12-31 00:00:00+00'::timestamptz
FROM profiles p WHERE p.id = u.id AND p.suspended;
