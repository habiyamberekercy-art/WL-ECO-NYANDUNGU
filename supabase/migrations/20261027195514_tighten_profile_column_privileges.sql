-- Fix: users could change their own role/suspended columns directly via the data API,
-- bypassing the admin_update_profile SECURITY DEFINER function entirely.
-- Revoke UPDATE on privilege-carrying columns, keep only user-editable ones.

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, organization) ON profiles TO authenticated;

-- The admin_update_profile function already checks the caller is an admin internally.
-- Revoke EXECUTE from anon (was already not granted, but be explicit) and keep
-- EXECUTE on authenticated so admins can call it — the function body authorizes them.
REVOKE EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) FROM anon;
-- authenticated retains EXECUTE; the function's internal check gates the action.
