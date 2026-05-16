-- 清理遺留的 created_by_legacy_author 欄位
-- 這些欄位是從 author_id 重命名而來，現在 created_by FK 已取代其用途
--
-- 此 migration 執行以下操作：
-- 1. 將 created_by_legacy_author 設為可 NULL（允許新資料不填）
-- 2. 添加註解說明欄位已廢棄
--
-- 注意：先不刪除欄位，以保留歷史資料的追溯性
-- 未來可考慮完全移除這些欄位

BEGIN;

-- advance_lists: 設為可 NULL
ALTER TABLE "public"."advance_lists"
  ALTER COLUMN "created_by_legacy_author" DROP NOT NULL;
COMMENT ON COLUMN "public"."advance_lists"."created_by_legacy_author"
  IS '[DEPRECATED 2026-01-16] Legacy author_id field. Use created_by instead. Will be removed in future.';

-- messages: 設為可 NULL（如果有 NOT NULL 約束）
ALTER TABLE "public"."messages"
  ALTER COLUMN "created_by_legacy_author" DROP NOT NULL;
COMMENT ON COLUMN "public"."messages"."created_by_legacy_author"
  IS '[DEPRECATED 2026-01-16] Legacy author_id field. Use created_by instead. Will be removed in future.';

-- payment_schedules: 此表若存在該欄位也設為可 NULL
-- 注意：如果表不存在該欄位，此命令會失敗，已用 DO block 處理
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payment_schedules'
    AND column_name = 'created_by_legacy_author'
  ) THEN
    ALTER TABLE "public"."payment_schedules"
      ALTER COLUMN "created_by_legacy_author" DROP NOT NULL;
    COMMENT ON COLUMN "public"."payment_schedules"."created_by_legacy_author"
      IS '[DEPRECATED 2026-01-16] Legacy field. Use created_by instead. Will be removed in future.';
  END IF;
END $$;

COMMIT;
