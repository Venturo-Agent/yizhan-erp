-- 2026-04-22: SSOT 整合 — tour_members 4 個欄位併入 order_members、DROP tour_members
-- William 決策：團員必然是訂單成員、tour_members 只是觀看層級不同、整合才是完整 SSOT
-- 對帳：10 row 全部能 1:1 對應到 order_members、4 欄全 NULL（無資料要 migrate）
BEGIN;

-- 1. 加 4 欄到 order_members（給未來團員住宿/餐飲設定用）
ALTER TABLE public.order_members
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS roommate_id uuid REFERENCES public.order_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS special_requests text,
  ADD COLUMN IF NOT EXISTS dietary_requirements text;

-- 2. 跳過 data migration（10 row 4 欄全 NULL、確認過）

-- 3. DROP tour_members
DROP TABLE IF EXISTS public.tour_members CASCADE;

COMMIT;
