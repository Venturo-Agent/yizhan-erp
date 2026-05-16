-- ROLLBACK: 還原 generate_voucher_no 為舊 signature (無 advisory lock)
BEGIN;

DROP FUNCTION IF EXISTS public.generate_voucher_no(uuid, date);

CREATE OR REPLACE FUNCTION public.generate_voucher_no(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefix text;
  v_last_no text;
  v_next_num int;
BEGIN
  v_prefix := 'JV' || to_char(CURRENT_DATE, 'YYYYMM');

  SELECT voucher_no INTO v_last_no
  FROM journal_vouchers
  WHERE workspace_id = p_workspace_id
    AND voucher_no LIKE v_prefix || '%'
  ORDER BY voucher_no DESC
  LIMIT 1;

  IF v_last_no IS NULL THEN
    v_next_num := 1;
  ELSE
    v_next_num := COALESCE(
      NULLIF(regexp_replace(v_last_no, '^' || v_prefix, ''), '')::int + 1,
      1
    );
  END IF;

  RETURN v_prefix || lpad(v_next_num::text, 4, '0');
END;
$function$;

COMMIT;
