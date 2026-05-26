-- ════════════════════════════════════════════════════════════════
-- payment_methods 加「對客戶開放」開關 is_customer_visible
-- ════════════════════════════════════════════════════════════════
--
-- 為什麼：
--   付款方式目前「前台客戶自助付款頁」與「後台員工開收款單」共用同一份清單
--   （過濾條件只有 type='receipt' AND is_active=true），沒有「對內/對外」之分。
--   導致內部用的收款方式（甲存 / 現金 / 支票 / 手動信用卡）漏到客戶自助付款頁、
--   客戶看到不該選的東西。
--
-- 做什麼：
--   比照 bank_accounts.is_disbursement_eligible（可作為出帳帳戶）的現成 pattern，
--   加一個布林開關 is_customer_visible：
--     true  = 開放客戶自助付款頁選用
--     false = 只供內部後台開收款單用
--
-- 預設與現有資料（William 2026-05-26 拍板）：
--   - 預設 false（保守：新增的付款方式預設不對外、要手動進設定頁打開）
--   - NOT NULL DEFAULT false 會讓「現有所有 payment_methods」自動填 false
--     → 等同「預設全關」、不預開任何方式（William 要自己進設定頁開對外的）
--
-- ⚠️ Production 影響（apply 前必讀）：
--   apply 後、客戶自助付款頁將「暫時無任何付款方式可選」，
--   直到有人進「財務設定 → 收款方式」把要對外的（永豐 linkpay / 匯款）勾「對外」。
--   → 建議挑「當下沒有客戶正在付款」的時段 apply、apply 後立即去設定頁開啟。

BEGIN;

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS is_customer_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payment_methods.is_customer_visible IS
  '是否開放給客戶自助付款頁選用。false=只供內部後台開收款單（譬如甲存/現金/支票）。比照 bank_accounts.is_disbursement_eligible。William 2026-05-26 拍板預設全關。';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.payment_methods DROP COLUMN IF EXISTS is_customer_visible;
-- COMMIT;
