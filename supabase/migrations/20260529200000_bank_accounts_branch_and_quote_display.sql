-- 為什麼：
--   1) bank_accounts 補「分公司維度」branch_id —— 現況所有帳戶只掛 workspace 層級，
--      多分公司（御風 2 分公司/3 帳戶、角落 1/2）帳戶全混在一起、分不出歸屬。
--      branch_id 先加、暫留 NULL（NULL = 全公司共用/總部），分公司指派 UI 之後再補。
--   2) is_quote_display：與既有「可出帳」is_disbursement_eligible 並列的旗標，
--      控制哪些帳戶可出現在報價單收款資訊。
--   3) bank_branch / account_holder_name：報價單要顯示「分行 / 戶名」但 bank_accounts 沒這兩欄，
--      報價單收款帳戶 SSOT 從 workspaces.bank_* 遷來時需要。
-- 設計來源：workspace/架構整理/2026-05-29-報價單收款帳戶遷移-spec.md
-- 命名注意：branch_id = 公司分公司；bank_branch = 銀行分行（如「信義分行」），兩者不同。

BEGIN;

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS branch_id           uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_quote_display    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_branch         text,
  ADD COLUMN IF NOT EXISTS account_holder_name text;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_branch ON public.bank_accounts(branch_id);

COMMENT ON COLUMN public.bank_accounts.branch_id           IS '所屬分公司（NULL=全公司共用/總部）';
COMMENT ON COLUMN public.bank_accounts.is_quote_display    IS '是否可出現在報價單收款資訊（解析規則見遷移 spec §2.2）';
COMMENT ON COLUMN public.bank_accounts.bank_branch         IS '銀行分行（報價單顯示用，如「信義分行」）';
COMMENT ON COLUMN public.bank_accounts.account_holder_name IS '戶名（報價單顯示用；空則退回公司全名）';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- rollback:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_bank_accounts_branch;
-- ALTER TABLE public.bank_accounts
--   DROP COLUMN IF EXISTS branch_id,
--   DROP COLUMN IF EXISTS is_quote_display,
--   DROP COLUMN IF EXISTS bank_branch,
--   DROP COLUMN IF EXISTS account_holder_name;
-- COMMIT;
