-- ─────────────────────────────────────────────────────────────────────────────
-- PR-2 Phase 3: 報價單 + 公司請款單編號 RPC（B7 補完）
--
-- 背景：
--   B7 盤點剩餘前端算編號場景、發現兩個還沒 RPC 化：
--     - 報價單 quote / quick quote (tour-quote-tab.tsx:140-155 / 198-212)
--         前端 SELECT max code 再 +1、兩個版本（Q 主報價 / QQ 快速報價）
--     - 公司請款單 (code-generator.ts:generateCompanyPaymentRequestCode)
--         前端用 existingPaymentRequests array 計 max + 1、兩個 caller
--         （bonus-payment.service / useRequestOperations.generateCompanyRequestCode）
--
-- 已有正確 pattern（抄）：
--   - generate_receipt_no (20260424040000) — tour_id scoped
--   - generate_voucher_no (20260424030000) — workspace + date scoped
--
-- 本 migration 補兩個 RPC：
--   - generate_quote_code(p_tour_id text, p_quote_type text DEFAULT 'standard')
--       → '{tour_code}-Q{NN}'（standard）或 '{tour_code}-QQ{NN}'（quick）
--       → tour-scoped advisory lock
--   - generate_company_payment_request_code(p_workspace_id uuid, p_expense_type text, p_request_date date)
--       → '{TYPE}-{YYYYMM}-{NNN}'（如 SAL-202501-001）
--       → workspace + expense_type + 年月 scoped advisory lock
--
-- ⚠️ 紅線檢核：
--   - 不動 RLS / 不動 workspaces 表 ✓
--   - 純 SQL function、無 SECURITY DEFINER（用 invoker 權限、走 RLS）
--   - 加 GRANT EXECUTE TO authenticated
--   - 風險：純 CREATE FUNCTION、不動現有資料、可隨時 ROLLBACK
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. generate_quote_code(p_tour_id text, p_quote_type text) → text
-- ═════════════════════════════════════════════════════════════════════════════
-- 注意：之前 search_path migration 提到的 generate_quote_code() 是無參數版本、
-- 那個 function 實際在 production DB 已不存在（被砍過）、本 migration 重建為帶參數版本

DROP FUNCTION IF EXISTS public.generate_quote_code();

CREATE OR REPLACE FUNCTION public.generate_quote_code(
  p_tour_id text,
  p_quote_type text DEFAULT 'standard'
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tour_code text;
  v_marker text;    -- 'Q' or 'QQ'
  v_prefix text;
  v_lock_key bigint;
  v_last_code text;
  v_next_num int;
BEGIN
  IF p_tour_id IS NULL OR p_tour_id = '' THEN
    RAISE EXCEPTION 'tour_id is required';
  END IF;

  -- 取得 tour code
  SELECT code INTO v_tour_code
  FROM public.tours
  WHERE id::text = p_tour_id;

  IF v_tour_code IS NULL THEN
    RAISE EXCEPTION 'Tour not found: %', p_tour_id;
  END IF;

  -- 決定 marker：quick → QQ、其他 → Q
  v_marker := CASE WHEN p_quote_type = 'quick' THEN 'QQ' ELSE 'Q' END;
  v_prefix := v_tour_code || '-' || v_marker;

  -- advisory lock 用 tour_id + quote_type（避免 standard 跟 quick 互相鎖死）
  v_lock_key := abs(hashtextextended(p_tour_id || ':quote:' || v_marker, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 找該 tour 同類型最大編號
  -- 要過濾 'Q' 不能撈到 'QQ'：用 regex '^{tour_code}-Q\d+$' / '^{tour_code}-QQ\d+$'
  SELECT code INTO v_last_code
  FROM public.quotes
  WHERE tour_id = p_tour_id
    AND code ~ ('^' || v_tour_code || '-' || v_marker || '\d+$')
  ORDER BY code DESC
  LIMIT 1;

  IF v_last_code IS NULL THEN
    v_next_num := 1;
  ELSE
    v_next_num := COALESCE(
      NULLIF(regexp_replace(v_last_code, '^' || v_prefix, ''), '')::int + 1,
      1
    );
  END IF;

  RETURN v_prefix || lpad(v_next_num::text, 2, '0');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_quote_code(text, text) TO authenticated;
ALTER FUNCTION public.generate_quote_code(text, text) SET search_path = 'public';

COMMENT ON FUNCTION public.generate_quote_code(text, text) IS
  '產生下一個報價單編號（{tour_code}-Q{NN} 或 -QQ{NN}）、tour scoped、advisory lock 防競態。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. generate_company_payment_request_code(workspace, expense_type, date) → text
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_company_payment_request_code(
  p_workspace_id uuid,
  p_expense_type text,
  p_request_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_year_month text;
  v_prefix text;
  v_lock_key bigint;
  v_last_code text;
  v_next_num int;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;
  IF p_expense_type IS NULL OR p_expense_type = '' THEN
    RAISE EXCEPTION 'expense_type is required';
  END IF;

  -- 格式：{TYPE}-{YYYYMM}-{NNN}、譬如 SAL-202501-001
  v_year_month := to_char(p_request_date, 'YYYYMM');
  v_prefix := upper(p_expense_type) || '-' || v_year_month || '-';

  -- workspace + type + 年月 scoped lock
  v_lock_key := abs(hashtextextended(
    p_workspace_id::text || ':company_pr:' || v_prefix, 0
  ));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 同 workspace + 同 prefix 最大編號
  SELECT code INTO v_last_code
  FROM public.payment_requests
  WHERE workspace_id = p_workspace_id
    AND code LIKE v_prefix || '%'
    AND code ~ ('^' || v_prefix || '\d+$')
  ORDER BY code DESC
  LIMIT 1;

  IF v_last_code IS NULL THEN
    v_next_num := 1;
  ELSE
    v_next_num := COALESCE(
      NULLIF(regexp_replace(v_last_code, '^' || v_prefix, ''), '')::int + 1,
      1
    );
  END IF;

  RETURN v_prefix || lpad(v_next_num::text, 3, '0');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_company_payment_request_code(uuid, text, date) TO authenticated;
ALTER FUNCTION public.generate_company_payment_request_code(uuid, text, date) SET search_path = 'public';

COMMENT ON FUNCTION public.generate_company_payment_request_code(uuid, text, date) IS
  '產生下一個公司請款單編號（{TYPE}-{YYYYMM}-{NNN}）、workspace + type + 年月 scoped、advisory lock 防競態。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 驗證 function 真的建出來
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc
  WHERE proname IN ('generate_quote_code', 'generate_company_payment_request_code');

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'PR-2 Phase 3 驗證失敗：function count = %、預期 2', v_count;
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ PR-2 Phase 3 完成：報價單 + 公司請款單編號 RPC 建好';
  RAISE NOTICE '  - generate_quote_code(text, text) → text';
  RAISE NOTICE '  - generate_company_payment_request_code(uuid, text, date) → text';
  RAISE NOTICE '  - 兩個都加了 advisory lock、scoped';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
