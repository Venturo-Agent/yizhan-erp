-- 回滾 is_from_core（跳過如果表不存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tour_requests' AND table_schema='public') THEN
    DROP INDEX IF EXISTS idx_tour_requests_tour_from_core;
    DROP INDEX IF EXISTS idx_tour_requests_is_from_core;
    ALTER TABLE public.tour_requests DROP COLUMN IF EXISTS is_from_core;
  END IF;
END $$;
