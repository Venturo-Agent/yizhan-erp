-- 為 pnrs 新增 tour_id 欄位，關聯到團號
BEGIN;

ALTER TABLE public.pnrs
ADD COLUMN IF NOT EXISTS tour_id TEXT REFERENCES public.tours(id);

COMMENT ON COLUMN public.pnrs.tour_id IS '關聯的團號';

COMMIT;
