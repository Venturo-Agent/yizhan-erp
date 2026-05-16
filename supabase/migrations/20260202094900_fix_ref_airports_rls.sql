-- Fix: ref_airports had RLS enabled but no policies

DROP POLICY IF EXISTS "ref_airports_public_read" ON public.ref_airports;
CREATE POLICY "ref_airports_public_read"
  ON public.ref_airports
  FOR SELECT
  USING (true);

COMMENT ON POLICY "ref_airports_public_read" ON public.ref_airports IS
  'Allow public read access to airport reference data';
