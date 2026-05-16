-- 新增 is_from_core 欄位（跳過如果表不存在）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tour_requests' AND table_schema='public') THEN
    RAISE NOTICE 'tour_requests does not exist, skipping';
    RETURN;
  END IF;

  ALTER TABLE public.tour_requests ADD COLUMN IF NOT EXISTS is_from_core BOOLEAN DEFAULT false;
  CREATE INDEX IF NOT EXISTS idx_tour_requests_is_from_core ON public.tour_requests(is_from_core);
  CREATE INDEX IF NOT EXISTS idx_tour_requests_tour_from_core ON public.tour_requests(tour_id, is_from_core);
  COMMENT ON COLUMN public.tour_requests.is_from_core IS '資料來源標記';
  UPDATE public.tour_requests SET is_from_core = false WHERE is_from_core IS NULL;
  ALTER TABLE public.tour_requests ALTER COLUMN is_from_core SET NOT NULL;
END $$;
