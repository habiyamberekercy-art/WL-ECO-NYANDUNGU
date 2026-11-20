/*
# Update user signup trigger to support role assignment

## Overview
Updates the `handle_new_user()` trigger function so that when a new user signs up,
their profile role can be set from the `role` field in signup metadata (e.g. 'manager' or 'admin').
If no role is provided, defaults to 'public'.

## Changes
1. Replaces `handle_new_user()` function — now reads `raw_user_meta_data->>'role'` and validates it against the allowed roles ('admin', 'manager', 'public'). Falls back to 'public' if missing or invalid.
2. The trigger `on_auth_user_created` is dropped and recreated to use the updated function.

## Security
- No new tables or policies.
- The function is SECURITY DEFINER with search_path = public (unchanged).
- Role is validated server-side against a hardcoded allowlist, so a user cannot inject arbitrary role values.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'public');
  IF requested_role NOT IN ('admin', 'manager', 'public') THEN
    requested_role := 'public';
  END IF;
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), requested_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
