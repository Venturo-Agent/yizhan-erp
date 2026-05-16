-- =============================================
-- Migration: 加 generate_tour_code RPC、防 tour code race condition
-- Date: 2026-04-24
--
-- 編號格式：{cityCode}{YYMMDD}{A-Z}
-- 例如：CNX250128A (清邁 2025/01/28 第1團)
-- 同日同城最多 26 團 (A-Z)、超過 raise exception
--
-- 修法：advisory lock 用 (workspace_id || ':tour:' || prefix)
--   同一 workspace 同日同城同時只允許一個 process 算下一字母
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_tour_code(
  p_workspace_id uuid,
  p_city_code text,
  p_departure_date date
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefix text;
  v_lock_key bigint;
  v_max_letter char(1);
  v_next_letter char(1);
BEGIN
  v_prefix := upper(p_city_code) || to_char(p_departure_date, 'YYMMDD');

  -- advisory lock 用 (workspace + prefix)
  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':tour:' || v_prefix, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 找同 workspace 同日同城最大字母
  SELECT MAX(substring(code from length(v_prefix) + 1 for 1))
    INTO v_max_letter
  FROM public.tours
  WHERE workspace_id = p_workspace_id
    AND code LIKE v_prefix || '%'
    AND length(code) = length(v_prefix) + 1
    AND substring(code from length(v_prefix) + 1 for 1) ~ '^[A-Z]$';

  IF v_max_letter IS NULL THEN
    v_next_letter := 'A';
  ELSIF v_max_letter = 'Z' THEN
    RAISE EXCEPTION 'Tour code 用盡 (% 已到 Z、同日最多 26 團)', v_prefix;
  ELSE
    v_next_letter := chr(ascii(v_max_letter) + 1);
  END IF;

  RETURN v_prefix || v_next_letter;
END;
$function$;

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM pg_proc WHERE proname = 'generate_tour_code';
  IF c = 0 THEN RAISE EXCEPTION 'generate_tour_code 沒建出來'; END IF;
END $$;

COMMIT;
