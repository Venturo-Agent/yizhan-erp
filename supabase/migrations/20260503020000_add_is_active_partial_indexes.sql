-- ============================================================================
-- 20260503020000_add_is_active_partial_indexes.sql
--
-- B-005: 加 is_active partial index 給高頻列表業務表
-- 來源：docs/_followup_backlog.md
--
-- partial index `(workspace_id, is_active) WHERE is_active = true`
-- 加速「列出本租戶啟用中的 X」這個典型列表 query。partial 比 full index 小、
-- 寫入維護成本更低（軟刪除的 row 不進 index）。
--
-- backlog 列了 6 張候選表、實際盤點後只 2 張適合：
--   ✅ customers          — 業務表、有 workspace_id + is_active
--   ✅ attractions        — 業務表、有 workspace_id + is_active
--   ⚠️ cities             — 已有 (country_id, is_active, display_order) 覆蓋
--   ❌ hotels             — 沒 workspace_id（ref-style 共享表）
--   ❌ restaurants        — 沒 workspace_id（ref-style 共享表）
--   ❌ tour_itinerary_items — 沒 is_active 欄位
--
-- 既有 (workspace_id) + (is_active) 單欄 index 不動。
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_workspace_active
  ON public.customers (workspace_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_attractions_workspace_active
  ON public.attractions (workspace_id, is_active)
  WHERE is_active = true;
