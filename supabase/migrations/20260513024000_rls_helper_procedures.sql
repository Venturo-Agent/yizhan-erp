-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Helper Procedures（William 2026-05-13 提案 — RLS 抽象層）
--
-- 戰略：跟今晚 `@/lib/codes.ts` 同理 — 把重複的 RLS pattern 抽成 procedure
--   未來新表的 RLS = 1 行 procedure call、不再重抄 16 行 CREATE POLICY
--
-- 提供 3 個 procedure：
--   1. setup_workspace_scoped_rls(table)
--      — table 有 workspace_id 欄位的 standard pattern（customers/suppliers/contracts 等）
--      — 自動生 4 條 policy（select/insert/update/delete）
--      — `workspace_id = get_current_user_workspace()`
--
--   2. setup_join_table_rls(table, employee_col)
--      — join 表（無 workspace_id、透過 employee 對應）的 standard pattern
--      — employee_branches / employee_brands / employee_departments 等
--      — 自動生 4 條 policy、透過 employees join
--
--   3. setup_inherited_rls(table, parent_table, parent_id_col)
--      — 子表（透過 parent_id 對應）的 standard pattern
--      — payment_request_items / order_members 等
--      — 自動透過 parent table 的 scope
--
-- 都 idempotent：先 DROP IF EXISTS policy 再 CREATE。重跑無害。
--
-- 用法：
--   CALL setup_workspace_scoped_rls('my_new_table');
--   CALL setup_join_table_rls('employee_xxx', 'employee_id');
--   CALL setup_inherited_rls('child_table', 'parent_table', 'parent_id');
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. setup_workspace_scoped_rls
--    給有 workspace_id 欄位的表用
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE public.setup_workspace_scoped_rls(p_table TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_qual TEXT := format('(workspace_id = public.get_current_user_workspace())');
BEGIN
  -- ENABLE RLS（idempotent）
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);

  -- Drop existing standard policies（idempotent）
  EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', p_table, p_table);

  -- Create 4 standard policies
  EXECUTE format($f$CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING %s WITH CHECK %s$f$,
                 p_table, p_table, v_qual, v_qual);
  EXECUTE format($f$CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);

  RAISE NOTICE '✓ % setup workspace-scoped RLS (4 policies)', p_table;
END;
$$;

COMMENT ON PROCEDURE public.setup_workspace_scoped_rls(TEXT) IS
  'Standard workspace-scoped RLS for tables with workspace_id column. Idempotent. Usage: CALL setup_workspace_scoped_rls(''my_table'');';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. setup_join_table_rls
--    給「員工×X」join 表用、透過 employee 對應 workspace
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE public.setup_join_table_rls(
  p_table TEXT,
  p_employee_col TEXT DEFAULT 'employee_id'
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_qual TEXT := format($q$(EXISTS (SELECT 1 FROM public.employees e WHERE e.id = public.%I.%I AND e.workspace_id = public.get_current_user_workspace()))$q$,
                       p_table, p_employee_col);
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', p_table, p_table);

  EXECUTE format($f$CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);

  RAISE NOTICE '✓ % setup join-table RLS via %.% → employees.workspace_id', p_table, p_table, p_employee_col;
END;
$$;

COMMENT ON PROCEDURE public.setup_join_table_rls(TEXT, TEXT) IS
  'RLS for employee-join tables (no workspace_id column). Scopes via employee.workspace_id. Idempotent.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. setup_inherited_rls
--    給「子表 inherit 父表 scope」用、透過 parent_id join
--    Caller 要先確保 parent table 已有 RLS（不然 inherit nothing）
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE public.setup_inherited_rls(
  p_table TEXT,
  p_parent_table TEXT,
  p_parent_id_col TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_qual TEXT := format($q$(EXISTS (SELECT 1 FROM public.%I p WHERE p.id = public.%I.%I AND p.workspace_id = public.get_current_user_workspace()))$q$,
                       p_parent_table, p_table, p_parent_id_col);
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', p_table, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', p_table, p_table);

  EXECUTE format($f$CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);
  EXECUTE format($f$CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING %s$f$,
                 p_table, p_table, v_qual);

  RAISE NOTICE '✓ % setup inherited RLS via %.% → %.workspace_id',
    p_table, p_table, p_parent_id_col, p_parent_table;
END;
$$;

COMMENT ON PROCEDURE public.setup_inherited_rls(TEXT, TEXT, TEXT) IS
  'RLS for child tables that inherit scope from a parent table via FK. Idempotent.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 完工驗證
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc
  WHERE proname IN ('setup_workspace_scoped_rls', 'setup_join_table_rls', 'setup_inherited_rls');

  IF v_count <> 3 THEN
    RAISE EXCEPTION 'RLS helper procedures 沒建齊、count = %', v_count;
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ RLS 抽象層完成：3 個 procedure 建好';
  RAISE NOTICE '  - setup_workspace_scoped_rls(table) — 標準 workspace 隔離';
  RAISE NOTICE '  - setup_join_table_rls(table, employee_col) — 員工 join 表';
  RAISE NOTICE '  - setup_inherited_rls(table, parent, parent_id) — 子表繼承';
  RAISE NOTICE '';
  RAISE NOTICE '未來建新表：1 行 CALL setup_*_rls(...) 取代 16 行 CREATE POLICY';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
