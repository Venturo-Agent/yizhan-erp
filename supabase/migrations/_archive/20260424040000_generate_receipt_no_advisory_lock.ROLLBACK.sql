-- ROLLBACK: 移除 generate_receipt_no RPC
BEGIN;
DROP FUNCTION IF EXISTS public.generate_receipt_no(text);
COMMIT;
