-- =============================================
-- Migration: 加 generate_receipt_no RPC、防 receipt 編號 race condition
-- Date: 2026-04-24
--
-- 背景：
--   舊 generateReceiptNumber 是 client 端純函數、由 caller 先 SELECT 同團所有 receipts、
--   傳 array 進來算 max + 1。兩個 caller 同時對同一 tour 開單會撞號。
--
-- 修法：
--   寫 DB RPC、advisory lock 用 tour_id、同一 tour 同時只允許一個 process 算下一號。
--   Application 改用 RPC、不再傳 existingReceipts。
--
-- 編號格式：{tour_code}-R{NN}（例如 BKK260610A-R01）
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_receipt_no(p_tour_id text)
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
  -- 拿 tour code
  SELECT code INTO v_tour_code
  FROM public.tours
  WHERE id::text = p_tour_id;

  IF v_tour_code IS NULL THEN
    RAISE EXCEPTION 'Tour not found: %', p_tour_id;
  END IF;

  v_prefix := v_tour_code || '-R';

  -- advisory lock 用 tour_id + ':receipt' (同一 tour 同時只能算一個下一號)
  v_lock_key := abs(hashtextextended(p_tour_id || ':receipt', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 查同 tour 最大號
  SELECT receipt_number INTO v_last_no
  FROM public.receipts
  WHERE tour_id = p_tour_id
    AND receipt_number LIKE v_prefix || '%'
  ORDER BY receipt_number DESC
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

DO $$
DECLARE
  c int;
BEGIN
  SELECT count(*) INTO c FROM pg_proc WHERE proname = 'generate_receipt_no';
  IF c = 0 THEN RAISE EXCEPTION 'generate_receipt_no 沒建出來'; END IF;
END $$;

COMMIT;
