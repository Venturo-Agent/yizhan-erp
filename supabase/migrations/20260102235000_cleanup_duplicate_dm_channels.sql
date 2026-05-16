-- ============================================
-- 清理重複的 DM 頻道
-- ============================================

BEGIN;

-- 刪除名稱為 dm:uuid-uuid 格式的頻道（這些是錯誤建立的）
DELETE FROM public.channels
WHERE name LIKE 'dm:%-%-%-%-%';

-- 也刪除相關的 channel_members（如果有外鍵的話會自動處理）

COMMIT;

DO $$
DECLARE
  deleted_count integer;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 已清理重複的 DM 頻道';
  RAISE NOTICE '========================================';
END $$;
