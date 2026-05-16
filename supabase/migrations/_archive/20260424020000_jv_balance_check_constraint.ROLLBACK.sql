-- ROLLBACK: 移除 journal_vouchers 借貸平衡 CHECK constraint
BEGIN;
ALTER TABLE public.journal_vouchers DROP CONSTRAINT IF EXISTS journal_vouchers_balance_check;
COMMIT;
