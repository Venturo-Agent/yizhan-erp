-- 20260528120000_finance_list_sort_group_three_buckets.sql
--
-- 為什麼：William 2026-05-28 拍板：請款列表排序要把「未付款」(pending) 跟「待付款」(confirmed)
-- 分開兩群、不要合併。原本 20260526130000_finance_list_sort_keys 的 list_sort_group 只兩群：
--   未付(pending+confirmed)=0 / 已付(paid)=1
-- 改成三群：
--   未付(pending)=0 在最前  /  待付(confirmed)=1 次前  /  已付(paid)=2 沉底
--
-- 群內 list_sort_key 不變（未付/待付舊在上、已付新在上）。
--
-- 純改 GENERATED ALWAYS AS 表達式、自動 backfill 全表、不需資料遷移。

BEGIN;

-- payment_requests：DROP 舊欄、重建新邏輯（GENERATED 欄不可 ALTER 表達式、只能 DROP/ADD）
ALTER TABLE public.payment_requests
  DROP COLUMN IF EXISTS list_sort_group;

ALTER TABLE public.payment_requests
  ADD COLUMN list_sort_group smallint
    GENERATED ALWAYS AS (
      CASE
        WHEN status = 'paid' THEN 2
        WHEN status = 'confirmed' THEN 1
        ELSE 0  -- pending 或其他未確認狀態
      END
    ) STORED;

-- 重建 index（依新 group 排序）
DROP INDEX IF EXISTS idx_payment_requests_sort;
CREATE INDEX idx_payment_requests_sort
  ON public.payment_requests (workspace_id, list_sort_group, list_sort_key, id)
  WHERE deleted_at IS NULL;

COMMIT;

-- ════ Rollback（萬一要回兩群版）════
-- BEGIN;
-- ALTER TABLE public.payment_requests DROP COLUMN IF EXISTS list_sort_group;
-- ALTER TABLE public.payment_requests
--   ADD COLUMN list_sort_group smallint
--     GENERATED ALWAYS AS (CASE WHEN status = 'paid' THEN 1 ELSE 0 END) STORED;
-- DROP INDEX IF EXISTS idx_payment_requests_sort;
-- CREATE INDEX idx_payment_requests_sort
--   ON public.payment_requests (workspace_id, list_sort_group, list_sort_key, id)
--   WHERE deleted_at IS NULL;
-- COMMIT;
