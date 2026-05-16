BEGIN;
DROP FUNCTION IF EXISTS public.generate_request_no(text);
DROP FUNCTION IF EXISTS public.generate_disbursement_no(uuid, date);
COMMIT;
