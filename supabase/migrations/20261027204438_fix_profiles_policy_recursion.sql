/*
# Fix infinite recursion in profiles policy

1. Problem
- The "select_all_profiles_staff" policy on `profiles` queried `profiles` itself,
  causing Postgres error 42P17 (infinite recursion). Every profile read failed,
  so signed-in users never got their role and were never routed to their dashboard.

2. Changes
- New helper function `public.is_staff()` (SECURITY DEFINER, fixed search_path) that
  returns true when the current user has role admin or manager. Because it runs as
  the owner, it reads `profiles` without re-triggering RLS.
- Recreate "select_all_profiles_staff" using `public.is_staff()`.

3. Security
- EXECUTE on `is_staff()` revoked from PUBLIC and anon; granted to authenticated only.
- The function only reveals whether the caller themselves is staff.
*/

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

DROP POLICY IF EXISTS "select_all_profiles_staff" ON public.profiles;
CREATE POLICY "select_all_profiles_staff" ON public.profiles FOR SELECT
  TO authenticated USING (public.is_staff());
