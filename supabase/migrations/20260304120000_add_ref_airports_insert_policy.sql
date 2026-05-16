-- Allow authenticated users to insert new airports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ref_airports_authenticated_insert' AND tablename = 'ref_airports') THEN
    CREATE POLICY "ref_airports_authenticated_insert"
      ON public.ref_airports
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Allow authenticated users to update airports (e.g. usage_count)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ref_airports_authenticated_update' AND tablename = 'ref_airports') THEN
    CREATE POLICY "ref_airports_authenticated_update"
      ON public.ref_airports
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
