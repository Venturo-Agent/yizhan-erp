-- payment_methods 升級：kind enum + 匯款自動分攤 + 主付款帳號
-- William 拍板 2026-05-11：
--
-- 1. kind text enum：
--      'wire_transfer' 匯款（自動算分攤）
--      'card'          刷卡（將來記刷卡手續費）
--      'cash'          現金
--      'cash_foreign'  現金（外幣）— 未來會標幣別 + 走不同處理
--      'check'         支票 — 未來有獨立記錄項目
--      'other'         其他 — 預備、name 由 user 自填
--
-- 2. fee_split_mode text：'average' = 平均分到每筆訂單成本
--                       'unified' = 每筆固定費、差額轉公司收入
--    只在 kind='wire_transfer' 時填、其他 kind 必須 NULL（CHECK 擋）
--
-- 3. default_bank_account_id：公司預設出款帳戶（FK bank_accounts）
--    DB 層允許 NULL（給既有 row 過渡）、UI 層在 kind='wire_transfer' 時強制要求
--
-- 4. 既有 default rows backfill：依 code 推 kind
--      CASH_*    → cash       CHECK_*    → check
--      TRANSFER_*→ wire_transfer + fee_split_mode='average' default
--      CARD_R    → card

BEGIN;

-- ============ 1. 加欄位 ============
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS kind text;

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS fee_split_mode text;

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS default_bank_account_id uuid;

-- ============ 2. backfill 既有 default rows ============
UPDATE public.payment_methods
SET kind = CASE
  WHEN code LIKE 'CASH%'     THEN 'cash'
  WHEN code LIKE 'CHECK%'    THEN 'check'
  WHEN code LIKE 'TRANSFER%' THEN 'wire_transfer'
  WHEN code LIKE 'CARD%'     THEN 'card'
  ELSE 'other'
END
WHERE kind IS NULL;

-- kind='wire_transfer' 的給 fee_split_mode='average' 預設（避免違反下面的 NOT NULL CHECK）
UPDATE public.payment_methods
SET fee_split_mode = 'average'
WHERE kind = 'wire_transfer' AND fee_split_mode IS NULL;

-- ============ 3. CHECK constraints ============

-- kind 必須是 enum 之一（NULL 暫時允許、給未來新建 row 一個過渡空間、default rows 已 backfill）
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_kind_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_kind_check
  CHECK (kind IS NULL OR kind IN ('wire_transfer', 'card', 'cash', 'cash_foreign', 'check', 'other'));

-- fee_split_mode 只能是 average / unified
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_fee_split_mode_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_fee_split_mode_check
  CHECK (fee_split_mode IS NULL OR fee_split_mode IN ('average', 'unified'));

-- kind='wire_transfer' 必須有 fee_split_mode（沒這個出納沒法算）
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_wire_transfer_split_mode_required;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_wire_transfer_split_mode_required
  CHECK (kind IS DISTINCT FROM 'wire_transfer' OR fee_split_mode IS NOT NULL);

-- fee_split_mode 只在 kind='wire_transfer' 時可填（其他 kind 必須 NULL、避免誤設）
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_fee_split_mode_only_for_wire_transfer;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_fee_split_mode_only_for_wire_transfer
  CHECK (kind = 'wire_transfer' OR fee_split_mode IS NULL);

-- ============ 4. FK：default_bank_account_id → bank_accounts ============
-- DB 層放寬 NULL、UI 層強制（避免 backfill 影響既有 TRANSFER row）

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_default_bank_account_fk;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_default_bank_account_fk
  FOREIGN KEY (default_bank_account_id)
  REFERENCES public.bank_accounts(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_default_bank_account
  ON public.payment_methods(default_bank_account_id)
  WHERE default_bank_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pm_kind ON public.payment_methods(kind);

COMMIT;

NOTIFY pgrst, 'reload schema';
