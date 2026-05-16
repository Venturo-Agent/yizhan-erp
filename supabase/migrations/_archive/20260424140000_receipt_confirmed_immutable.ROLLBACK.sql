BEGIN;
DROP TRIGGER IF EXISTS tg_receipt_confirmed_immutable ON public.receipts;
DROP FUNCTION IF EXISTS public.receipt_confirmed_immutable();
COMMIT;
