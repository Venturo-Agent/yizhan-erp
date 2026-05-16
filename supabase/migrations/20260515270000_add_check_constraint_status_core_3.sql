-- ════════════════════════════════════════════════════════════════════
-- 加 CHECK constraint：payment_requests / orders / disbursement_orders
--
-- 為什麼：
--   2026-05-15 SSOT 盤點發現 3 張會計核心表 status 欄沒 CHECK constraint、
--   任何字串都進得去（11 筆 billed 殘留就是這樣產生）
--   先在 20260515260000 把 11 筆 billed → paid 後、本 migration 把柵欄釘上
--
-- 對齊 SSOT：src/lib/design/status-tone-map.ts STATUS_LABEL_MAP
-- 完整盤點：Logan-Workspace/2026-05-15-狀態-SSOT-盤點.md
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- payment_requests：pending / confirmed / paid（5/15 William 拍板 3 狀態）
ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'paid'::text]));

-- orders：pending / confirmed / completed / cancelled（SSOT 4 狀態）
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text]));

-- disbursement_orders：pending / confirmed / paid（SSOT 3 狀態）
ALTER TABLE public.disbursement_orders
  ADD CONSTRAINT disbursement_orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'paid'::text]));

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_status_check;
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE public.disbursement_orders DROP CONSTRAINT IF EXISTS disbursement_orders_status_check;
-- COMMIT;
