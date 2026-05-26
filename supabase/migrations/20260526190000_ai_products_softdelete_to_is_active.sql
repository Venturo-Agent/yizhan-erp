-- ════════════════════════════════════════════════════════════════
-- ai_products 軟刪除對齊地方法律 #3：deleted_at → is_active
-- 2026-05-26（Alex 接手、William 拍板「加 is_published」方案 A）
-- ════════════════════════════════════════════════════════════════
-- 背景：
--   原表（20260526160000）用 is_active 表「上架/下架」、deleted_at 表「軟刪除」。
--   但地方法律 #3 要求軟刪除統一走 is_active、不准 deleted_at。
-- 衝突解法（方案 A、保留「下架≠刪除」功能）：
--   - 新增 is_published：管「上架 / 下架」（true=上架販售）
--   - is_active 回歸語意：軟刪除標記（true=存在、false=已刪）
--   - 移除 deleted_at：軟刪除改走 is_active=false
-- 安全性：apply 前已確認 production ai_products 為空表（0 筆）、無資料遷移風險。
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 新增上架/下架欄位（預設上架）
ALTER TABLE public.ai_products
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ai_products.is_published IS
  '上架 / 下架（true=上架販售、false=下架暫停）。下架≠刪除、可重新上架。';
COMMENT ON COLUMN public.ai_products.is_active IS
  '軟刪除標記（true=存在、false=已刪）。地方法律 #3：軟刪除統一走 is_active、不用 deleted_at。';

-- 2. 重建 active index（原 WHERE deleted_at IS NULL → 改吃 is_active）
DROP INDEX IF EXISTS idx_ai_products_active;
CREATE INDEX idx_ai_products_active
  ON public.ai_products(workspace_id, is_published) WHERE is_active;

-- 3. 移除 deleted_at（軟刪除改走 is_active=false、地方法律 #3）
ALTER TABLE public.ai_products DROP COLUMN IF EXISTS deleted_at;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- ALTER TABLE public.ai_products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- DROP INDEX IF EXISTS idx_ai_products_active;
-- CREATE INDEX idx_ai_products_active
--   ON public.ai_products(workspace_id, is_active) WHERE deleted_at IS NULL;
-- ALTER TABLE public.ai_products DROP COLUMN IF EXISTS is_published;
-- COMMIT;
