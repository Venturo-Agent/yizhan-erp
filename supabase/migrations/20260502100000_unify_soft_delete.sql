-- =====================================================
-- 軟刪除欄位統一 (Day 3 - A1)
-- =====================================================
-- 對齊 venturo-app SSOT (VENTURO_STANDARDS.md §7)：
--   軟刪除一律用 is_active boolean NOT NULL DEFAULT true
--   查詢用 .eq("is_active", true)
--   不要 is_deleted、不要 deleted_at
--
-- ERP 原本三套並存，這個 migration 一次砍光：
--   - tours: 有 is_active + is_deleted + deleted_at → 留 is_active，砍另兩個
--   - receipts: 只有 deleted_at → 加 is_active，砍 deleted_at
--   - transportation_rates: 有 is_active + deleted_at → 砍 deleted_at
--
-- 已驗證：以上三表目前沒有 row 處於「軟刪除」狀態，
--         所以資料層次只是欄位刪除，不需翻譯資料。
--         即便如此，仍寫成 idempotent / 防衛式 SQL。
-- =====================================================

BEGIN;

-- =====================================================
-- 1) tours: 三套並存 → 統一成 is_active
-- =====================================================

-- 1a) 把舊軟刪除狀態翻譯到 is_active（保險：目前 0 row 命中）
UPDATE public.tours
SET is_active = false
WHERE (is_deleted = true OR deleted_at IS NOT NULL)
  AND is_active IS DISTINCT FROM false;

-- 1b) 補齊預設值與 NOT NULL（對齊 VENTURO_STANDARDS）
UPDATE public.tours SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.tours
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

-- 1c) 砍掉 is_deleted 的 partial index
DROP INDEX IF EXISTS public.idx_tours_is_deleted;

-- 1d) 砍欄位
ALTER TABLE public.tours DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE public.tours DROP COLUMN IF EXISTS deleted_at;

-- =====================================================
-- 2) receipts: 只有 deleted_at → 加 is_active 後砍 deleted_at
-- =====================================================

-- 2a) 加欄位（先 nullable，方便補資料）
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2b) 翻譯 deleted_at → is_active
UPDATE public.receipts
SET is_active = CASE WHEN deleted_at IS NULL THEN true ELSE false END
WHERE is_active IS NULL OR (deleted_at IS NOT NULL AND is_active = true);

-- 2c) 鎖死欄位語意
ALTER TABLE public.receipts
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

-- 2d) 重建依賴 deleted_at 的 partial index
DROP INDEX IF EXISTS public.idx_receipts_date;
DROP INDEX IF EXISTS public.idx_receipts_type;
DROP INDEX IF EXISTS public.idx_receipts_workspace;

CREATE INDEX IF NOT EXISTS idx_receipts_date
  ON public.receipts (receipt_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_receipts_type
  ON public.receipts (receipt_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_receipts_workspace
  ON public.receipts (workspace_id) WHERE is_active = true;

-- 2e) 砍欄位
ALTER TABLE public.receipts DROP COLUMN IF EXISTS deleted_at;

-- =====================================================
-- 3) transportation_rates: 已有 is_active → 砍 deleted_at
-- =====================================================

-- 3a) 把曾經被軟刪的翻成 is_active=false（目前 0 row）
UPDATE public.transportation_rates
SET is_active = false
WHERE deleted_at IS NOT NULL AND is_active IS DISTINCT FROM false;

-- 3b) 鎖死 is_active 語意
UPDATE public.transportation_rates SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.transportation_rates
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

-- 3c) 重建依賴 deleted_at 的 partial index
DROP INDEX IF EXISTS public.idx_transportation_rates_workspace;
DROP INDEX IF EXISTS public.idx_transportation_rates_country;
DROP INDEX IF EXISTS public.idx_transportation_rates_vehicle_type;
DROP INDEX IF EXISTS public.idx_transportation_rates_category;
DROP INDEX IF EXISTS public.idx_transportation_rates_active;

CREATE INDEX IF NOT EXISTS idx_transportation_rates_workspace
  ON public.transportation_rates (workspace_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_country
  ON public.transportation_rates (country_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_vehicle_type
  ON public.transportation_rates (vehicle_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_category
  ON public.transportation_rates (category) WHERE is_active = true;
-- is_active 自己上 partial index 沒意義（謂詞=自身），改成完整 index
CREATE INDEX IF NOT EXISTS idx_transportation_rates_active
  ON public.transportation_rates (is_active);

-- 3d) 砍欄位
ALTER TABLE public.transportation_rates DROP COLUMN IF EXISTS deleted_at;

-- =====================================================
-- 4) 修掉 RPC 對 deleted_at 的引用
-- =====================================================
-- get_tour_pnl: r.deleted_at IS NULL → r.is_active = true
CREATE OR REPLACE FUNCTION public.get_tour_pnl(
  p_workspace_id uuid,
  p_year_start date,
  p_year_end date
)
RETURNS TABLE(
  id text, code text, name text,
  departure_date date, return_date date,
  status text, max_participants integer,
  estimated_cost numeric, estimated_revenue numeric, estimated_profit numeric,
  actual_revenue numeric, actual_cost numeric, actual_profit numeric,
  revenue_diff numeric, cost_diff numeric,
  closing_date date
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    t.id,
    t.code,
    t.name,
    t.departure_date,
    t.return_date,
    t.status,
    t.max_participants,

    -- 預估值
    t.total_cost     AS estimated_cost,
    t.total_revenue  AS estimated_revenue,
    t.profit         AS estimated_profit,

    -- 實際值
    COALESCE((
      SELECT SUM(r.total_amount)
      FROM receipts r
      WHERE r.tour_id = t.id AND r.is_active = true
    ), 0) AS actual_revenue,

    COALESCE((
      SELECT SUM(pr.amount)
      FROM payment_requests pr
      WHERE pr.tour_id = t.id
    ), 0) AS actual_cost,

    COALESCE((
      SELECT SUM(r.total_amount)
      FROM receipts r
      WHERE r.tour_id = t.id AND r.is_active = true
    ), 0) - COALESCE((
      SELECT SUM(pr.amount)
      FROM payment_requests pr
      WHERE pr.tour_id = t.id
    ), 0) AS actual_profit,

    -- 差異
    COALESCE((
      SELECT SUM(r.total_amount)
      FROM receipts r
      WHERE r.tour_id = t.id AND r.is_active = true
    ), 0) - t.total_revenue AS revenue_diff,

    COALESCE((
      SELECT SUM(pr.amount)
      FROM payment_requests pr
      WHERE pr.tour_id = t.id
    ), 0) - t.total_cost AS cost_diff,

    t.closing_date

  FROM tours t
  WHERE t.workspace_id = p_workspace_id
    AND t.departure_date BETWEEN p_year_start AND p_year_end
    AND t.status != 'cancelled'
  ORDER BY t.departure_date DESC;
$function$;

-- 註：log_file_changes / get_unread_count / get_unread_counts_batch
-- 引用的 files / traveler_messages 等表在當前 schema 中不存在，
-- 屬於孤兒函數。本次只處理活的依賴，不順手清理（守住任務邊界）。

COMMIT;
