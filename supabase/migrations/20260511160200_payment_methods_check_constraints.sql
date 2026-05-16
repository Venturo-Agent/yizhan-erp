-- payment_methods 補強 CHECK constraint
-- William review 2026-05-11 拍板：UI 強制的兩條規則、DB 也要擋（雙保險）
--
-- 1. kind='wire_transfer' 必須有 default_bank_account_id（沒這個出納沒法決定從哪匯）
-- 2. fee_split_mode='unified' 必須有 fee_income_account_id（差額要轉這個科目）
--
-- 用 NOT VALID 模式：CHECK 只擋未來 INSERT/UPDATE、不驗證既有資料
-- 理由：既有 default rows (TRANSFER_*) backfill 時沒設 default_bank_account_id、用 NOT VALID 避免擋住
-- William 拍板：舊資料不動、靠 UI 擋新建（CHECK 是雙保險避免 API 直送繞過）

BEGIN;

-- kind='wire_transfer' 必須有 default_bank_account_id
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_wire_transfer_bank_account_required;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_wire_transfer_bank_account_required
  CHECK (kind IS DISTINCT FROM 'wire_transfer' OR default_bank_account_id IS NOT NULL)
  NOT VALID;

-- fee_split_mode='unified' 必須有 fee_income_account_id
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_unified_fee_income_required;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_unified_fee_income_required
  CHECK (fee_split_mode IS DISTINCT FROM 'unified' OR fee_income_account_id IS NOT NULL)
  NOT VALID;

COMMIT;

NOTIFY pgrst, 'reload schema';
