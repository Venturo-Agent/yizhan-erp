-- 斷開所有 itinerary 與 quote 的連結
-- 新邏輯：從旅遊團統一建立行程表和報價單

BEGIN;

-- 清除 quotes 中的 itinerary_id 連結
UPDATE public.quotes
SET itinerary_id = NULL
WHERE itinerary_id IS NOT NULL;

-- 注意：保留 tour_id 連結，因為這是新邏輯需要的（旅遊團 -> 報價單）

COMMIT;
