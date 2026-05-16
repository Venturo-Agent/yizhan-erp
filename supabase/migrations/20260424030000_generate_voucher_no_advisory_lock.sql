-- =============================================
-- Migration: generate_voucher_no 加 advisory lock 防 race condition
-- Date: 2026-04-24
--
-- 背景：
--   舊 generate_voucher_no(p_workspace_id) 用 SELECT MAX + 1、無 lock。
--   高併發時兩個 process 同時呼叫、都 SELECT 同一個 max、回傳重複編號 → unique constraint fail。
--   Application 端 (3 個 API: vouchers/create, vouchers/auto-create, period-closing)
--   還在自己寫 client 端 SELECT MAX、雙重 race。
--
-- 修法：
--   1. RPC 加 pg_advisory_xact_lock(hash(workspace_id || year_month))
--      - transaction 結束自動釋放、不會死鎖
--      - 同一個 workspace 同月同時只有一個 process 在算下一號
--   2. 加 p_voucher_date 參數 (default CURRENT_DATE)
--      - 補登過去日期的傳票 → year-month 跟著日期
--      - 不傳就用當天 (向後相容)
--
-- 影響：
--   - RPC signature 從 (uuid) 變 (uuid, date DEFAULT CURRENT_DATE)
--   - 既有 caller (DB 內) 不受影響 (default 補上)
--   - Application 改用 RPC (見對應 commit)
--
-- Rollback: 見同目錄 .ROLLBACK.sql
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_voucher_no(
  p_workspace_id uuid,
  p_voucher_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefix text;
  v_lock_key bigint;
  v_last_no text;
  v_next_num int;
BEGIN
  v_prefix := 'JV' || to_char(p_voucher_date, 'YYYYMM');

  -- 用 (workspace_id + year_month) hash 當 advisory lock key
  -- transaction commit/rollback 時自動釋放、不需手動 unlock
  v_lock_key := abs(hashtextextended(p_workspace_id::text || v_prefix, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 鎖內查最大號 (此時其他 process 在 lock 上等)
  SELECT voucher_no INTO v_last_no
  FROM public.journal_vouchers
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

-- 驗證 RPC 存在且 signature 對
DO $$
DECLARE
  c int;
BEGIN
  SELECT count(*) INTO c
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'generate_voucher_no'
    AND pg_get_function_arguments(p.oid) LIKE '%p_voucher_date%';
  IF c = 0 THEN
    RAISE EXCEPTION 'generate_voucher_no 沒有 p_voucher_date 參數、signature 沒生效';
  END IF;
END $$;

COMMIT;
