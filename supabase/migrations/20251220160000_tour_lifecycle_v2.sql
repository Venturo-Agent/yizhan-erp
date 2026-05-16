-- =============================================
-- Tour Lifecycle V2.0 - 版本鎖定機制
-- =============================================

-- 1. 新增 tours 表欄位
ALTER TABLE "tours"
  -- 版本鎖定相關
  ADD COLUMN IF NOT EXISTS "locked_quote_id" text,
  ADD COLUMN IF NOT EXISTS "locked_quote_version" integer,
  ADD COLUMN IF NOT EXISTS "locked_itinerary_id" text,
  ADD COLUMN IF NOT EXISTS "locked_itinerary_version" integer,
  ADD COLUMN IF NOT EXISTS "locked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "locked_by" uuid REFERENCES "auth"."users"(id),
  -- 解鎖記錄
  ADD COLUMN IF NOT EXISTS "last_unlocked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_unlocked_by" uuid REFERENCES "auth"."users"(id),
  ADD COLUMN IF NOT EXISTS "modification_reason" text;

-- 2. 新增欄位註解
COMMENT ON COLUMN "tours"."locked_quote_id" IS '鎖定的報價單 ID';
COMMENT ON COLUMN "tours"."locked_quote_version" IS '鎖定的報價單版本號';
COMMENT ON COLUMN "tours"."locked_itinerary_id" IS '鎖定的行程 ID';
COMMENT ON COLUMN "tours"."locked_itinerary_version" IS '鎖定的行程版本號';
COMMENT ON COLUMN "tours"."locked_at" IS '版本鎖定時間';
COMMENT ON COLUMN "tours"."locked_by" IS '執行鎖定的用戶 ID';
COMMENT ON COLUMN "tours"."last_unlocked_at" IS '上次解鎖時間';
COMMENT ON COLUMN "tours"."last_unlocked_by" IS '上次解鎖的用戶 ID';
COMMENT ON COLUMN "tours"."modification_reason" IS '解鎖修改原因';

-- 3. 建立索引加速查詢
CREATE INDEX IF NOT EXISTS "idx_tours_locked_quote" ON "tours"("locked_quote_id");
CREATE INDEX IF NOT EXISTS "idx_tours_locked_itinerary" ON "tours"("locked_itinerary_id");
CREATE INDEX IF NOT EXISTS "idx_tours_locked_at" ON "tours"("locked_at");
