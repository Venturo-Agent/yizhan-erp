-- ════════════════════════════════════════════════════════════════════
-- Migration: 砍掉「匯款手續費分攤」整套 schema（William 拍板 2026-05-13）
-- ════════════════════════════════════════════════════════════════════
-- Why:
--   2026-05-11 上線「平均分攤 / 統一收取」+「主付款帳號」+「公司收入科目」整套。
--   2026-05-12 William 拍板暫關、但 code 上只擺了個沒接上的 flag。
--   2026-05-13 重新確認後決定徹底清理（流程混亂大於收益、新專案無歷史包袱）。
--
-- Production 驗證（apply 前查過）:
--   - 32 筆 payment_methods 中 0 筆填過真實值（8 筆 fee_split_mode 是 5/11 backfill 預設）
--   - 5 筆 disbursement_orders 0 筆有 payment_method_id
--   → 砍欄位 100% 安全、沒資料遺失。
--
-- 保留（William 拍板）:
--   - payment_methods.kind 種類 enum（分類用、未來各 kind 接邏輯）
--   - payment_methods.fee_fixed 欄位（給未來 kind 邏輯預留、UI 已砍）
--   - disbursement_orders.payment_method_id FK（出納單付款方式下拉用）
--
-- 砍的東西:
--   - 3 欄位: payment_methods.{fee_split_mode, default_bank_account_id, fee_income_account_id}
--   - 5 CHECK constraint: fee_split_mode_check / fee_split_mode_only_for_wire_transfer /
--                         unified_fee_income_required / wire_transfer_bank_account_required /
--                         wire_transfer_split_mode_required
--   - 2 index: idx_pm_default_bank_account / idx_pm_fee_income_account
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 砍 CHECK constraints（依賴欄位的、必先 drop）
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_fee_split_mode_check,
  DROP CONSTRAINT IF EXISTS payment_methods_fee_split_mode_only_for_wire_transfer,
  DROP CONSTRAINT IF EXISTS payment_methods_unified_fee_income_required,
  DROP CONSTRAINT IF EXISTS payment_methods_wire_transfer_bank_account_required,
  DROP CONSTRAINT IF EXISTS payment_methods_wire_transfer_split_mode_required;

-- 2. 砍 index
DROP INDEX IF EXISTS public.idx_pm_default_bank_account;
DROP INDEX IF EXISTS public.idx_pm_fee_income_account;

-- 3. 砍欄位
ALTER TABLE public.payment_methods
  DROP COLUMN IF EXISTS fee_split_mode,
  DROP COLUMN IF EXISTS default_bank_account_id,
  DROP COLUMN IF EXISTS fee_income_account_id;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════════
-- BEGIN;
--
-- -- 1. 還原欄位
-- ALTER TABLE public.payment_methods
--   ADD COLUMN IF NOT EXISTS fee_split_mode TEXT,
--   ADD COLUMN IF NOT EXISTS default_bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
--   ADD COLUMN IF NOT EXISTS fee_income_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
--
-- -- 2. 還原 index
-- CREATE INDEX IF NOT EXISTS idx_pm_default_bank_account
--   ON public.payment_methods (default_bank_account_id)
--   WHERE default_bank_account_id IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_pm_fee_income_account
--   ON public.payment_methods (fee_income_account_id)
--   WHERE fee_income_account_id IS NOT NULL;
--
-- -- 3. 還原 CHECK constraint（按 5/11 原 migration 內容）
-- ALTER TABLE public.payment_methods
--   ADD CONSTRAINT payment_methods_fee_split_mode_check
--     CHECK (fee_split_mode IS NULL OR fee_split_mode = ANY (ARRAY['average'::text, 'unified'::text]));
-- ALTER TABLE public.payment_methods
--   ADD CONSTRAINT payment_methods_fee_split_mode_only_for_wire_transfer
--     CHECK (kind = 'wire_transfer'::text OR fee_split_mode IS NULL);
-- ALTER TABLE public.payment_methods
--   ADD CONSTRAINT payment_methods_wire_transfer_split_mode_required
--     CHECK (kind IS DISTINCT FROM 'wire_transfer'::text OR fee_split_mode IS NOT NULL);
-- ALTER TABLE public.payment_methods
--   ADD CONSTRAINT payment_methods_wire_transfer_bank_account_required
--     CHECK (kind IS DISTINCT FROM 'wire_transfer'::text OR default_bank_account_id IS NOT NULL) NOT VALID;
-- ALTER TABLE public.payment_methods
--   ADD CONSTRAINT payment_methods_unified_fee_income_required
--     CHECK (fee_split_mode IS DISTINCT FROM 'unified'::text OR fee_income_account_id IS NOT NULL) NOT VALID;
--
-- COMMIT;
-- ════════════════════════════════════════════════════════════════════
