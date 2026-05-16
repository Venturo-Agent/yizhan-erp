-- ================================================================
-- 備份 daily_itinerary 資料（在清理前）
-- 日期: 2026-03-12
-- 原因: 即將從 daily_itinerary jsonb 移除 meals/accommodation/activities
-- ================================================================

-- 建立備份表
CREATE TABLE IF NOT EXISTS _backup_daily_itinerary (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  itinerary_id text NOT NULL REFERENCES itineraries(id),
  backed_up_at timestamptz DEFAULT now(),
  original_data jsonb NOT NULL,
  CONSTRAINT _backup_daily_itinerary_itinerary_id_key UNIQUE (itinerary_id)
);

-- 備份所有 daily_itinerary 資料
INSERT INTO _backup_daily_itinerary (itinerary_id, original_data)
SELECT id, daily_itinerary
FROM itineraries
WHERE daily_itinerary IS NOT NULL
ON CONFLICT (itinerary_id) DO UPDATE
SET 
  original_data = EXCLUDED.original_data,
  backed_up_at = now();

-- 檢查備份數量
DO $$
DECLARE
  backup_count integer;
  itinerary_count integer;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM _backup_daily_itinerary;
  SELECT COUNT(*) INTO itinerary_count FROM itineraries WHERE daily_itinerary IS NOT NULL;
  
  RAISE NOTICE '✅ 備份完成：% 筆行程表已備份（原始 % 筆）', backup_count, itinerary_count;
END $$;

COMMENT ON TABLE _backup_daily_itinerary IS '備份 daily_itinerary 清理前的完整資料（2026-03-12）';
