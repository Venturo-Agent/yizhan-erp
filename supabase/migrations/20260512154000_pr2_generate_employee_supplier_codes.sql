-- ─────────────────────────────────────────────────────────────────────────────
-- PR-2 Phase 1: 員工 + 供應商編號 RPC（advisory lock 防競態 + workspace scoped）
--
-- 背景：
--   2026-05-12 William 測試發現「存檔有衝突」、根因之一是前端算編號無鎖：
--     - EmployeeForm.tsx:328-335 從 store 找 max + 1
--     - SuppliersPage.tsx:27-57 query 最大 code + 1
--   兩個分頁同時新增 → 算出同一編號 → 後端 unique constraint 撞 → 失敗
--
-- 已有正確 pattern（不發明、抄）：
--   - generate_request_no (20260424110000) — payment_requests
--   - generate_tour_code (20260424050000) — tours、workspace-aware advisory lock
--
-- 本 migration 補兩個 RPC：
--   - generate_employee_number(workspace_id) → 'E001' / 'E002' / ...
--   - generate_supplier_code(workspace_id)   → 'S00001' / 'S00002' / ...
--
-- 共同特性：
--   1. workspace_id 為必要參數（NULL raise exception）
--   2. advisory lock key = hash(workspace_id || ':<entity>')
--   3. 用 regexp 過濾合法編號（'^E\d+$'）、不算進畸形舊資料
--   4. 找 max（不是 count + 1）— 避免「中間有人刪」算錯
--
-- ⚠️ 紅線檢核：
--   - 不動 RLS / 不動 workspaces 表 ✓
--   - 純 SQL function、無 SECURITY DEFINER（用 invoker 權限、走 RLS）
--   - 加 GRANT EXECUTE TO authenticated（讓登入 user 能 call）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. generate_employee_number(p_workspace_id uuid) → text
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_employee_number(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_lock_key bigint;
  v_max_num int;
  v_next_num int;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  -- workspace 內加鎖、同 workspace 的並發 caller 排隊
  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':employee_number', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 找該 workspace 最大編號（解析 'E001' → 1）
  -- regexp 過濾：只算 'E' + digits 的合法編號
  SELECT COALESCE(MAX(substring(employee_number from 2)::int), 0)
    INTO v_max_num
  FROM public.employees
  WHERE workspace_id = p_workspace_id
    AND employee_number ~ '^E\d+$';

  v_next_num := v_max_num + 1;
  RETURN 'E' || lpad(v_next_num::text, 3, '0');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_employee_number(uuid) TO authenticated;

COMMENT ON FUNCTION public.generate_employee_number(uuid) IS
  '產生下一個員工編號（E001 格式）、workspace scoped、advisory lock 防競態。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. generate_supplier_code(p_workspace_id uuid) → text
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_supplier_code(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_lock_key bigint;
  v_max_num int;
  v_next_num int;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':supplier_code', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COALESCE(MAX(substring(code from 2)::int), 0)
    INTO v_max_num
  FROM public.suppliers
  WHERE workspace_id = p_workspace_id
    AND code ~ '^S\d+$';

  v_next_num := v_max_num + 1;
  RETURN 'S' || lpad(v_next_num::text, 5, '0');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_supplier_code(uuid) TO authenticated;

COMMENT ON FUNCTION public.generate_supplier_code(uuid) IS
  '產生下一個供應商編號（S00001 格式）、workspace scoped、advisory lock 防競態。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 驗證 function 真的建出來
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc
  WHERE proname IN ('generate_employee_number', 'generate_supplier_code');

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'PR-2 Phase 1 驗證失敗：function count = %、預期 2', v_count;
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ PR-2 Phase 1 完成：員工 + 供應商編號 RPC 建好';
  RAISE NOTICE '  - generate_employee_number(uuid) → text';
  RAISE NOTICE '  - generate_supplier_code(uuid) → text';
  RAISE NOTICE '  - 兩個都加了 advisory lock、workspace scoped';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
