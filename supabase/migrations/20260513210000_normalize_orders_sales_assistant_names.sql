-- ════════════════════════════════════════════════════════════════════════
-- 純資料清理：統一 orders.sales_person / assistant 寫法
--
-- 背景：
--   - orders 用 text 存業務 / 助理名字（不是 FK）
--   - CORNER 有 17 筆 sales_person='William'（混合大小寫）+ 員工表是 'WILLIAM'
--   - 全 workspace 多筆 sales_person='' / assistant=''（空字串）
--
-- 動作：
--   1. CORNER 'William' → 'WILLIAM' （17 筆、跟員工表對齊）
--   2. 空字串 '' 全清成 NULL（統一「沒填」語意）
--
-- 不動：
--   - 'Jess' 3 筆（William 之後會補建員工、暫留 text）
--   - 其他 workspace 的名字（YUFEN / DEMO 名字都已對齊員工表）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. CORNER 'William' (混合大小寫) → 'WILLIAM'
UPDATE public.orders
SET sales_person = 'WILLIAM'
WHERE workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81'
  AND sales_person = 'William';

UPDATE public.orders
SET assistant = 'WILLIAM'
WHERE workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81'
  AND assistant = 'William';

-- 2. 空字串 → NULL
UPDATE public.orders SET sales_person = NULL WHERE sales_person = '';
UPDATE public.orders SET assistant = NULL WHERE assistant = '';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- 不可逆 — 沒有備份 'William' 大小寫原樣 / 不知道哪些 '' 是有意填的
-- 若要還原、需從 production backup 還原 orders 表
-- BEGIN;
-- UPDATE public.orders
-- SET sales_person = 'William'
-- WHERE workspace_id = 'a89335d4-85f1-492b-83c7-2476ab7c5d81'
--   AND sales_person = 'WILLIAM'
--   AND order_number IN ( ... 從 backup 撈出原本是 'William' 的 17 個訂單號 ... );
-- COMMIT;
