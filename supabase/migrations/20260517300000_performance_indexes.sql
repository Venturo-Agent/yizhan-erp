-- 20260517300000_performance_indexes.sql
-- 為什麼：Phase 3 查詢加速 — 補上常見 (workspace_id + 過濾欄) 的複合 partial index
-- 所有 index 都用 IF NOT EXISTS，可重跑、冪等。
-- 影響表：orders / tours / customers / payment_requests / employees（均已確認存在）

BEGIN;

-- orders：依 workspace 列表 + 建立時間排序（最常見的訂單列表查詢）
CREATE INDEX IF NOT EXISTS idx_orders_workspace_created
  ON public.orders (workspace_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- orders：依 workspace + 狀態篩選（篩選進行中 / 完成 / 取消）
CREATE INDEX IF NOT EXISTS idx_orders_workspace_status
  ON public.orders (workspace_id, status)
  WHERE deleted_at IS NULL;

-- tours：依 workspace + 出發日期排序（行程管理列表）
CREATE INDEX IF NOT EXISTS idx_tours_workspace_departure
  ON public.tours (workspace_id, departure_date)
  WHERE deleted_at IS NULL;

-- customers：依 workspace + 姓名排序（客戶搜尋列表）
CREATE INDEX IF NOT EXISTS idx_customers_workspace_name
  ON public.customers (workspace_id, name)
  WHERE deleted_at IS NULL;

-- payment_requests：依 workspace + 狀態篩選（請款審核流程）
CREATE INDEX IF NOT EXISTS idx_payment_requests_workspace_status
  ON public.payment_requests (workspace_id, status)
  WHERE deleted_at IS NULL;

-- employees：依 workspace + 在職狀態篩選（HR 人員列表）
CREATE INDEX IF NOT EXISTS idx_employees_workspace_status
  ON public.employees (workspace_id, status)
  WHERE deleted_at IS NULL;

COMMIT;

-- ════ Rollback（萬一有問題，複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_orders_workspace_created;
-- DROP INDEX IF EXISTS public.idx_orders_workspace_status;
-- DROP INDEX IF EXISTS public.idx_tours_workspace_departure;
-- DROP INDEX IF EXISTS public.idx_customers_workspace_name;
-- DROP INDEX IF EXISTS public.idx_payment_requests_workspace_status;
-- DROP INDEX IF EXISTS public.idx_employees_workspace_status;
-- COMMIT;
