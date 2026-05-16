-- 簡化景點架構：city_id 改成選填
-- 景點改為綁定區域（region_id），城市變成選填

BEGIN;

-- 1. 把 city_id 改成 nullable
ALTER TABLE public.attractions
ALTER COLUMN city_id DROP NOT NULL;

-- 2. 為 region_id 設定 NOT NULL（需要先更新沒有 region_id 的資料）
-- 先檢查有沒有沒有 region_id 的資料
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.attractions
  WHERE region_id IS NULL;

  IF null_count > 0 THEN
    RAISE NOTICE '有 % 筆景點沒有 region_id，需要先補上', null_count;
    -- 嘗試從 city 反推 region
    UPDATE public.attractions a
    SET region_id = c.region_id
    FROM public.cities c
    WHERE a.city_id = c.id
      AND a.region_id IS NULL
      AND c.region_id IS NOT NULL;
  END IF;
END $$;

-- 3. 添加註解說明新的架構
COMMENT ON COLUMN public.attractions.region_id IS '所屬區域 ID（必填，景點的主要分類依據）';
COMMENT ON COLUMN public.attractions.city_id IS '所屬城市 ID（選填，用於更精確的位置標記）';

COMMIT;
