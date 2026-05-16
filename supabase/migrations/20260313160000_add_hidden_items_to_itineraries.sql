-- ================================================================
-- 新增行程表隱藏項目清單
-- 日期: 2026-03-13
-- 原因: 支援行程展示時隱藏部分項目（例：排版問題）
-- 設計: 只記錄「被隱藏的項目 ID」，預設全部顯示
-- ================================================================

-- 新增隱藏清單欄位
ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS hidden_items_for_web jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden_items_for_brochure jsonb DEFAULT '[]'::jsonb;

-- 新增註解
COMMENT ON COLUMN itineraries.hidden_items_for_web IS 
  '網頁展示時隱藏的核心表項目 UUID 清單（預設顯示全部，只記錄例外）';

COMMENT ON COLUMN itineraries.hidden_items_for_brochure IS 
  '手冊打印時隱藏的核心表項目 UUID 清單（預設顯示全部，只記錄例外）';

-- 檢查
DO $$
DECLARE
  web_column_exists boolean;
  brochure_column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'hidden_items_for_web'
  ) INTO web_column_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'hidden_items_for_brochure'
  ) INTO brochure_column_exists;
  
  IF web_column_exists AND brochure_column_exists THEN
    RAISE NOTICE '✅ 隱藏清單欄位已新增';
  ELSE
    RAISE WARNING '❌ 欄位新增失敗';
  END IF;
END $$;
