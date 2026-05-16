-- Disable RLS on itineraries table
-- Venturo doesn't use RLS (as per CLAUDE.md)

ALTER TABLE public.itineraries DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "itineraries_all_access" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_select" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_insert" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_update" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_delete" ON public.itineraries;
