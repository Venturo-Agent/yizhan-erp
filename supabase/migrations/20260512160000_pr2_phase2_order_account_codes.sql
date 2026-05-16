-- ─────────────────────────────────────────────────────────────────────────────
-- PR-2 Phase 2: 訂單編號 + 會計子科目編號 RPC
--
-- 背景：PR-2 Phase 1 已做員工 + 供應商編號 RPC、確認 pattern。
--   Phase 2 補完剩下 2 種「前端算編號」的場景：
--   - 訂單編號 ({tour_code}-O01) — orders/page.tsx + tours/ToursPage.tsx 兩處
--   - 會計子科目編號 ({parent_code}-1) — accounting/accounts/page.tsx
--
--   tour code 不在本 migration、因為 generate_tour_code RPC 早就有了
--   （20260424050000）、主要 caller 都已用、只剩 useQuoteTour.ts 沒切。
--   那個前端 fix 跟本 migration 一起 push。
--
-- 已知 schema 限制（之後另開 PR 清）：
--   - orders 表有 code + order_number 雙欄、現存資料寫法不一致（SSOT 破碎）
--     本 RPC 寫 order_number、不碰 code 欄位
--   - chart_of_accounts.code 沒有 unique constraint（DB 沒擋撞號）
--     本 RPC 防競態、但 race 之外的「人工輸入重複」DB 還是不擋、要另外補 UNIQUE
--
-- Pattern：同 Phase 1（advisory lock + scoped MAX）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. generate_order_number(p_tour_id text) → text
--    格式：{tour_code}-O{NN}（兩位流水）、per-tour scoped
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_order_number(p_tour_id text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tour_code text;
  v_prefix text;
  v_lock_key bigint;
  v_max_num int;
  v_next_num int;
BEGIN
  IF p_tour_id IS NULL OR p_tour_id = '' THEN
    RAISE EXCEPTION 'tour_id is required';
  END IF;

  -- 找對應 tour 的 code
  SELECT code INTO v_tour_code
  FROM public.tours
  WHERE id = p_tour_id;

  IF v_tour_code IS NULL THEN
    RAISE EXCEPTION 'tour not found: %', p_tour_id;
  END IF;

  v_prefix := v_tour_code || '-O';

  -- 同 tour 內並發 caller 排隊
  v_lock_key := abs(hashtextextended(p_tour_id || ':order_number', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 找該 tour 已有 orders 的最大流水號
  -- 解析：'{tour_code}-O01' → 1、'{tour_code}-O27' → 27
  SELECT COALESCE(MAX(substring(order_number from length(v_prefix) + 1)::int), 0)
    INTO v_max_num
  FROM public.orders
  WHERE tour_id = p_tour_id
    AND order_number ~ ('^' || regexp_replace(v_prefix, '([\^\$\.\|\?\*\+\(\)\[\]\\])', '\\\1', 'g') || '\d+$');

  v_next_num := v_max_num + 1;
  RETURN v_prefix || lpad(v_next_num::text, 2, '0');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_order_number(text) TO authenticated;

COMMENT ON FUNCTION public.generate_order_number(text) IS
  '產生下一個訂單編號（{tour_code}-O01 格式）、per-tour scoped、advisory lock 防競態。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. generate_account_child_code(p_workspace_id uuid, p_parent_code text) → text
--    格式：{parent_code}-{N}（不補零）、per-(workspace, parent) scoped
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_account_child_code(
  p_workspace_id uuid,
  p_parent_code text
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefix text;
  v_lock_key bigint;
  v_max_num int;
  v_next_num int;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;
  IF p_parent_code IS NULL OR p_parent_code = '' THEN
    RAISE EXCEPTION 'parent_code is required';
  END IF;

  v_prefix := p_parent_code || '-';

  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':account:' || p_parent_code, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COALESCE(MAX(substring(code from length(v_prefix) + 1)::int), 0)
    INTO v_max_num
  FROM public.chart_of_accounts
  WHERE workspace_id = p_workspace_id
    AND code ~ ('^' || regexp_replace(v_prefix, '([\^\$\.\|\?\*\+\(\)\[\]\\])', '\\\1', 'g') || '\d+$');

  v_next_num := v_max_num + 1;
  RETURN v_prefix || v_next_num::text;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_account_child_code(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.generate_account_child_code(uuid, text) IS
  '產生下一個會計子科目代碼（{parent_code}-N 格式）、per-(workspace, parent) scoped、advisory lock 防競態。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 驗證
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc
  WHERE proname IN ('generate_order_number', 'generate_account_child_code');

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'PR-2 Phase 2 驗證失敗：function count = %、預期 2', v_count;
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ PR-2 Phase 2 完成：訂單 + 會計子科目編號 RPC 建好';
  RAISE NOTICE '  - generate_order_number(text) → text';
  RAISE NOTICE '  - generate_account_child_code(uuid, text) → text';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
