-- 為什麼：每張報價單記住自己的收款帳戶（持久化、重印一致）。
--   開報價單時依 spec §2.2 解析候選並預設帶入；單一候選免選、多候選由開單者選、選後寫入此欄。
--   NULL = 尚未指定，列印時即時依 §2.2 解析。
-- 設計來源：workspace/架構整理/2026-05-29-報價單收款帳戶遷移-spec.md

BEGIN;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_bank_account ON public.quotes(bank_account_id);

COMMENT ON COLUMN public.quotes.bank_account_id IS '本報價單顯示的收款帳戶（NULL=依遷移 spec §2.2 即時解析候選）';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- rollback:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_quotes_bank_account;
-- ALTER TABLE public.quotes DROP COLUMN IF EXISTS bank_account_id;
-- COMMIT;
