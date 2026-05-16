-- 為 proposal_packages 新增行程表類型欄位
-- itinerary_type: 'simple' (簡易行程表) | 'timeline' (時間軸) | NULL (未選擇)
-- timeline_data: 儲存時間軸行程資料

BEGIN;

-- 新增 itinerary_type 欄位
ALTER TABLE public.proposal_packages
ADD COLUMN IF NOT EXISTS itinerary_type TEXT;

-- 新增 timeline_data 欄位 (JSONB)
ALTER TABLE public.proposal_packages
ADD COLUMN IF NOT EXISTS timeline_data JSONB;

-- 加入 check constraint 確保 itinerary_type 只能是指定值
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_packages_itinerary_type_check'
  ) THEN
    ALTER TABLE public.proposal_packages
    ADD CONSTRAINT proposal_packages_itinerary_type_check
    CHECK (itinerary_type IS NULL OR itinerary_type IN ('simple', 'timeline'));
  END IF;
END $$;

-- 更新現有資料：如果有 itinerary_id，設定為 'simple'
UPDATE public.proposal_packages
SET itinerary_type = 'simple'
WHERE itinerary_id IS NOT NULL AND itinerary_type IS NULL;

-- 加入註解
COMMENT ON COLUMN public.proposal_packages.itinerary_type IS '行程表類型: simple=簡易行程表, timeline=時間軸';
COMMENT ON COLUMN public.proposal_packages.timeline_data IS '時間軸行程資料 (JSON)';

COMMIT;
