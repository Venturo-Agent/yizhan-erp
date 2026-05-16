-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 重排 sort_order=0 的 order_members（按 created_at, id 重新編號）
-- 2026-05-14 Robin
--
-- 背景：
--   order_members 有 4 個 insert 路徑（手動新增空白 / OCR 上傳 / addMembers helper / PnrMatchDialog）
--   全部都沒指定 sort_order、DB DEFAULT 0、結果同一張單多筆新成員都搶 0 排序。
--   列表 ORDER BY sort_order ASC, created_at ASC, id ASC 雖然有 tie-break、但相近毫秒 created_at
--   會讓使用者看到「空白、OCR、空白、OCR」交錯而不是「全空白後接全 OCR」的直覺順序。
--
--   修法：4 個 insert 路徑已改成 query MAX(sort_order) + 1 起遞增（同 PR）。
--         但既有 sort_order=0 的 row 還亂、要重排。
--
-- 本 migration：
--   對每個 order_id 內 sort_order=0 的 row、按 created_at, id 給連續 sort_order
--   起點 = 該 order 內非 0 row 的 MAX + 1（避免跟既有 1-N 衝突）
--
-- Idempotent：sort_order 不為 0 的 row 不動、可重跑（重跑 sort_order=0 row 0 筆、no-op）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

WITH base AS (
  -- 每個 order 內、非 0 row 的最大 sort_order（沒有非 0 row 就回 0）
  SELECT
    order_id,
    COALESCE(MAX(sort_order) FILTER (WHERE sort_order > 0), 0) AS max_non_zero
  FROM public.order_members
  GROUP BY order_id
),
ranked AS (
  -- 對每個 order 內 sort_order=0 的 row 按時間排、編號從 1 起
  SELECT
    om.id,
    om.order_id,
    base.max_non_zero,
    ROW_NUMBER() OVER (PARTITION BY om.order_id ORDER BY om.created_at, om.id) AS rn
  FROM public.order_members om
  JOIN base ON base.order_id = om.order_id
  WHERE om.sort_order = 0
)
UPDATE public.order_members om
SET sort_order = ranked.max_non_zero + ranked.rn
FROM ranked
WHERE om.id = ranked.id;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑、把這次新編的 row 還原為 0）════
-- 注意：rollback 後沒辦法精準還原「原本哪些 row 是 0」、會把所有編號 > 該 order max_non_zero 的 row 變 0
-- 不要在 migration 之後再 insert 新 row 才 rollback、會誤殺新 row
-- BEGIN;
-- WITH base AS (
--   SELECT order_id, MAX(sort_order) FILTER (WHERE created_at < '2026-05-14 04:00:00+00') AS pre_migration_max
--   FROM order_members GROUP BY order_id
-- )
-- UPDATE order_members om SET sort_order = 0
-- FROM base WHERE om.order_id = base.order_id AND om.sort_order > base.pre_migration_max;
-- COMMIT;
