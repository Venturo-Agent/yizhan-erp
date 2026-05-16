-- =============================================
-- Migration: generate_request_no signature 改 tour_code (text)、放掉 tour_id
-- Date: 2026-04-24
--
-- 原因: caller (useRequestOperations / CostTransferDialog) 拿到的是 tour_code 字串、不是 uuid
-- 直接接 tour_code 省一次 join、邏輯一致
-- =============================================

BEGIN;

DROP FUNCTION IF EXISTS public.generate_request_no(text);

CREATE OR REPLACE FUNCTION public.generate_request_no(p_tour_code text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefix text;
  v_lock_key bigint;
  v_last_no text;
  v_next_num int;
BEGIN
  IF p_tour_code IS NULL OR p_tour_code = '' THEN
    RAISE EXCEPTION 'tour_code is required';
  END IF;

  v_prefix := p_tour_code || '-I';
  v_lock_key := abs(hashtextextended(p_tour_code || ':request', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT code INTO v_last_no
  FROM public.payment_requests
  WHERE code LIKE v_prefix || '%'
  ORDER BY code DESC
  LIMIT 1;

  IF v_last_no IS NULL THEN
    v_next_num := 1;
  ELSE
    v_next_num := COALESCE(
      NULLIF(regexp_replace(v_last_no, '^' || v_prefix, ''), '')::int + 1,
      1
    );
  END IF;

  RETURN v_prefix || lpad(v_next_num::text, 2, '0');
END;
$function$;

COMMIT;
