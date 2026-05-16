-- Phase 0: 清空供應商資料（將重新建立）
-- 注意：luxury_hotels 和 restaurants 是行程表參考資料，不是供應商，保留不動

-- 清空 suppliers 表資料（處理 FK 衝突）
DO $$ BEGIN
  DELETE FROM public.suppliers;
EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE '⚠️ suppliers 有依賴資料，跳過清空';
END $$;
