-- ════════════════════════════════════════════════════════════════════
-- Fix code generation concurrency bugs（員工 / 供應商 / 子科目編號）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼修：
--   原本的 generate_employee_number / generate_supplier_code /
--   generate_account_child_code 走「advisory_xact_lock + SELECT MAX」、
--   但函數本身不寫任何資料、Caller 是「先拿號 → 後 INSERT」兩步、
--   並發時：caller A 拿 E001 但還沒 INSERT、caller B 已拿 lock 看到 MAX=0、
--   也回 E001、撞號。
--
--   tests/concurrency/{employee,supplier,account-child}-*.test.ts
--   壓測抓到、main 已壞、修這個 commit 才解。
--
-- 修法：加 workspace_code_counters 表記「下一個該發的值」、advisory_lock
--   內 GREATEST(MAX-from-table, counter) + 1、UPDATE counter、回值。
--
--   • table 的 MAX：兼容外部手動 INSERT 還沒走 RPC 的舊資料
--   • counter：兼容 RPC 拿了號但 caller 還沒 INSERT 的「保留中」值
--   • 兩者取大、保證未來新號永遠領先所有已知值

BEGIN;

-- 1. counter table（per workspace、per code_type、可選 scope）
CREATE TABLE IF NOT EXISTS public.workspace_code_counters (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code_type text NOT NULL,
  scope text NOT NULL DEFAULT '',
  -- 下次該發的數值（永遠領先所有已知值）
  next_value integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, code_type, scope)
);

COMMENT ON TABLE public.workspace_code_counters IS
  '編號發號機（並發保護用）。code_type 例：employee / supplier / account_child。scope 用在 account_child 存 parent_code、其他類為空字串。';

-- RLS：admin only（編號生成走 RPC、不需 user 直接讀寫）
ALTER TABLE public.workspace_code_counters ENABLE ROW LEVEL SECURITY;

-- 不開 user policy、只允許 service_role 走 RPC

-- 2. 重寫 generate_employee_number — 用 counter
CREATE OR REPLACE FUNCTION public.generate_employee_number(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_max_from_table int;
  v_max_from_counter int;
  v_next int;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  -- workspace + code_type advisory lock（並發排隊）
  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':employee_number', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 從 employees 表抓 MAX（兼容外部 INSERT）
  SELECT COALESCE(MAX(substring(employee_number from 2)::int), 0)
    INTO v_max_from_table
  FROM public.employees
  WHERE workspace_id = p_workspace_id
    AND employee_number ~ '^E\d+$';

  -- 從 counter 抓「上次發到哪」（兼容 caller 拿號但還沒 INSERT）
  SELECT COALESCE(next_value - 1, 0)
    INTO v_max_from_counter
  FROM public.workspace_code_counters
  WHERE workspace_id = p_workspace_id
    AND code_type = 'employee'
    AND scope = '';

  -- 取最大、+1
  v_next := GREATEST(COALESCE(v_max_from_table, 0), COALESCE(v_max_from_counter, 0)) + 1;

  -- 寫回 counter（保留這個值、下次 RPC 跳過去）
  INSERT INTO public.workspace_code_counters (workspace_id, code_type, scope, next_value, updated_at)
  VALUES (p_workspace_id, 'employee', '', v_next + 1, now())
  ON CONFLICT (workspace_id, code_type, scope)
  DO UPDATE SET next_value = EXCLUDED.next_value, updated_at = EXCLUDED.updated_at;

  RETURN 'E' || lpad(v_next::text, 3, '0');
END;
$$;

-- 3. 重寫 generate_supplier_code — 用 counter
CREATE OR REPLACE FUNCTION public.generate_supplier_code(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_max_from_table int;
  v_max_from_counter int;
  v_next int;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  v_lock_key := abs(hashtextextended(p_workspace_id::text || ':supplier_code', 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COALESCE(MAX(substring(code from 2)::int), 0)
    INTO v_max_from_table
  FROM public.suppliers
  WHERE workspace_id = p_workspace_id
    AND code ~ '^S\d+$';

  SELECT COALESCE(next_value - 1, 0)
    INTO v_max_from_counter
  FROM public.workspace_code_counters
  WHERE workspace_id = p_workspace_id
    AND code_type = 'supplier'
    AND scope = '';

  v_next := GREATEST(COALESCE(v_max_from_table, 0), COALESCE(v_max_from_counter, 0)) + 1;

  INSERT INTO public.workspace_code_counters (workspace_id, code_type, scope, next_value, updated_at)
  VALUES (p_workspace_id, 'supplier', '', v_next + 1, now())
  ON CONFLICT (workspace_id, code_type, scope)
  DO UPDATE SET next_value = EXCLUDED.next_value, updated_at = EXCLUDED.updated_at;

  RETURN 'S' || lpad(v_next::text, 5, '0');
END;
$$;

-- 4. 重寫 generate_account_child_code — 用 counter、scope = parent_code
CREATE OR REPLACE FUNCTION public.generate_account_child_code(
  p_workspace_id uuid,
  p_parent_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_lock_key bigint;
  v_max_from_table int;
  v_max_from_counter int;
  v_next int;
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
    INTO v_max_from_table
  FROM public.chart_of_accounts
  WHERE workspace_id = p_workspace_id
    AND code ~ ('^' || regexp_replace(v_prefix, '([\^\$\.\|\?\*\+\(\)\[\]\\])', '\\\1', 'g') || '\d+$');

  SELECT COALESCE(next_value - 1, 0)
    INTO v_max_from_counter
  FROM public.workspace_code_counters
  WHERE workspace_id = p_workspace_id
    AND code_type = 'account_child'
    AND scope = p_parent_code;

  v_next := GREATEST(COALESCE(v_max_from_table, 0), COALESCE(v_max_from_counter, 0)) + 1;

  INSERT INTO public.workspace_code_counters (workspace_id, code_type, scope, next_value, updated_at)
  VALUES (p_workspace_id, 'account_child', p_parent_code, v_next + 1, now())
  ON CONFLICT (workspace_id, code_type, scope)
  DO UPDATE SET next_value = EXCLUDED.next_value, updated_at = EXCLUDED.updated_at;

  RETURN v_prefix || v_next::text;
END;
$$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════════
-- BEGIN;
-- -- 還原成舊版（直接讀 MAX、不寫 counter）— 從 git blame 抓 20260512154000 的版本
-- -- 重灌 generate_employee_number / generate_supplier_code / generate_account_child_code 舊定義
-- DROP TABLE IF EXISTS public.workspace_code_counters CASCADE;
-- COMMIT;
