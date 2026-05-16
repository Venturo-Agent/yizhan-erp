-- ════════════════════════════════════════════════════════════════════════════
-- bank_accounts 加「可作為出帳帳戶」flag
--
-- William 2026-05-15 拍板：有些公司帳戶是定存 / 投資戶、要列在資產但不能出帳。
-- 出納單 wizard 只列 is_disbursement_eligible=true 的帳戶當「出帳帳戶」。
-- 同時砍掉舊版 wizard 內 hardcoded「現金」獨立帳戶（現金本質還是從某銀行領）。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS is_disbursement_eligible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.bank_accounts.is_disbursement_eligible IS
  '可作為出帳帳戶（出納單 wizard 列入選項）。false=只是資產記錄、不能出帳（譬如定存戶）';

-- 既有帳戶 default true、不需要回填
-- NOTIFY PostgREST reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════════ Rollback ════════
-- BEGIN;
-- ALTER TABLE public.bank_accounts DROP COLUMN IF EXISTS is_disbursement_eligible;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
