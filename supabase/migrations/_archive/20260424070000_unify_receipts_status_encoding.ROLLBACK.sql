-- ROLLBACK: receipts.status 從 'pending'/'confirmed' 還原為 '0'/'1'
BEGIN;

ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_status_check;

UPDATE public.receipts SET status = '0' WHERE status = 'pending';
UPDATE public.receipts SET status = '1' WHERE status = 'confirmed';

COMMIT;
