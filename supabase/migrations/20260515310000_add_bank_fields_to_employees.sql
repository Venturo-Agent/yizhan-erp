-- ════════════════════════════════════════════════════════════════════
-- employees 加 4 個 bank 欄位、給「代墊人對方銀行」用
--
-- 為什麼：
--   2026-05-15 William 拍板：請款單可填代墊人 (advanced_by)、
--   出納單列表「付款對象」改顯示「{代墊人姓名}（代墊）」、「對方銀行」用代墊人的銀行
--   現在 employees 表沒銀行欄、要先加上
--
-- 欄位都是 nullable text、不加 CHECK constraint（銀行格式不嚴格、留彈性）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_name text;

COMMENT ON COLUMN public.employees.bank_code IS '銀行代碼（譬如 808）、給代墊人匯款用';
COMMENT ON COLUMN public.employees.bank_name IS '銀行名稱（譬如 玉山銀行）';
COMMENT ON COLUMN public.employees.bank_account_number IS '銀行帳號';
COMMENT ON COLUMN public.employees.bank_account_name IS '戶名';

COMMIT;

-- 必跑 reload schema（PostgREST 才認到新欄）
NOTIFY pgrst, 'reload schema';

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.employees
--   DROP COLUMN IF EXISTS bank_code,
--   DROP COLUMN IF EXISTS bank_name,
--   DROP COLUMN IF EXISTS bank_account_number,
--   DROP COLUMN IF EXISTS bank_account_name;
-- COMMIT;
