-- =============================================
-- Migration: generate_request_no + generate_disbursement_no RPC、防 race condition
-- Date: 2026-04-24
--
-- 補完紅線⑤ 第 4/4 跟另外發現的 disbursement race (現有 disbursement_orders 已撞號 2 次)
--
-- 編號格式:
--   Request:      {tour_code}-I{NN}    (例 BKK260610A-I01)
--   Disbursement: DO{YYMMDD}-{NNN}     (例 DO260423-001、workspace-scoped)
--
-- 機制: pg_advisory_xact_lock、同 scope 同時只允許一個 process 算下一號
-- =============================================

BEGIN;

-- =====================================
-- Request 編號 (團體請款)
-- =====================================
CREATE OR REPLACE FUNCTION public.generate_request_no(p_tour_id text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tour_code text;
  v_prefix text;
  v_lock_key bigint;
  v_last_no text;
  v_next_num int;
BEGIN
  SELECT code INTO v_tour_code FROM public.tours WHERE id::text = p_tour_id;
  IF v_tour_code IS NULL THEN
    RAISE EXCEPTION 'Tour not found: %', p_tour_id;
  END IF;

  v_prefix := v_tour_code || '-I';
  v_lock_key := abs(hashtextextended(p_tour_id || ':request', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT code INTO v_last_no
  FROM public.payment_requests
  WHERE tour_id::text = p_tour_id
    AND code LIKE v_prefix || '%'
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

-- =====================================
-- Disbursement 編號 (出納單、workspace-scoped)
-- =====================================
CREATE OR REPLACE FUNCTION public.generate_disbursement_no(
  p_workspace_id uuid,
  p_disbursement_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefix text;
  v_lock_key bigint;
  v_max_code text;
  v_max_order_number text;
  v_last_no text;
  v_next_num int;
BEGIN
  v_prefix := 'DO' || to_char(p_disbursement_date, 'YYMMDD');
  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':disbursement:' || v_prefix, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 同 workspace 同日最大號 (查 code OR order_number、兩個欄位都有編號)
  SELECT max(code) INTO v_max_code
  FROM public.disbursement_orders
  WHERE workspace_id = p_workspace_id
    AND code LIKE v_prefix || '-%';

  SELECT max(order_number) INTO v_max_order_number
  FROM public.disbursement_orders
  WHERE workspace_id = p_workspace_id
    AND order_number LIKE v_prefix || '-%';

  v_last_no := GREATEST(v_max_code, v_max_order_number);

  IF v_last_no IS NULL THEN
    v_next_num := 1;
  ELSE
    v_next_num := COALESCE(
      NULLIF(regexp_replace(v_last_no, '^' || v_prefix || '-', ''), '')::int + 1,
      1
    );
  END IF;

  RETURN v_prefix || '-' || lpad(v_next_num::text, 3, '0');
END;
$function$;

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM pg_proc WHERE proname IN ('generate_request_no', 'generate_disbursement_no');
  IF c <> 2 THEN RAISE EXCEPTION '預期 2 個 RPC、實際 %', c; END IF;
END $$;

COMMIT;
