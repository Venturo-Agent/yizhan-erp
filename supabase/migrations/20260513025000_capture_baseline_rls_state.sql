-- ─────────────────────────────────────────────────────────────────────────────
-- B5: Capture production RLS baseline @ 2026-05-13
--
-- 解決 SSOT 破碎：5/12 PR-1 / 5/13 凌晨多次踩到「migration files 講的 ≠ production」
-- 例：5 張表 RLS 已 ENABLED 但 migration 沒紀錄、payment_request_items FORCE 沒 trace。
--
-- 本 migration 是 **inert snapshot**：純 RAISE NOTICE + COMMENT ON、不動任何 policy。
--   - 不修改 RLS state
--   - apply 時把當下 state 寫進 migration log（audit trail）
--   - 為關鍵表加 RLS pattern COMMENT、未來 query schema 看得到
--
-- baseline 數字（5/13 SSH Vultr query 得到）：
--   - 公開表（public schema）共 101 個
--   - RLS ENABLED：101 / 101（全開）
--   - FORCE RLS：0（紅線 A 安全）
--   - 0-policy 表：~7（admin only / 待追：personal_expenses / supplier_categories / tour_destinations）
--
-- 跑了會發生什麼：
--   - DO 區塊 SELECT 當下 state、RAISE NOTICE 印 baseline
--   - 若數字偏離 5/13 預期、RAISE WARNING（提醒有手動改動未紀錄）
--   - 加 COMMENT ON 給 7 張採用非標準 RLS pattern 的表（payment_request_items / employee_X / image_library）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Baseline 數字 sanity check
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_total INT;
  v_enabled INT;
  v_forced INT;
  v_zero_policy INT;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE c.relrowsecurity),
         count(*) FILTER (WHERE c.relforcerowsecurity)
    INTO v_total, v_enabled, v_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r';

  SELECT count(*) INTO v_zero_policy
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      );

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'B5 Capture: Production RLS Baseline @ 2026-05-13';
  RAISE NOTICE '───────────────────────────────────────────────────────────';
  RAISE NOTICE '  總表數                 ：% （expected: 101）', v_total;
  RAISE NOTICE '  RLS ENABLED           ：%', v_enabled;
  RAISE NOTICE '  FORCE RLS             ：% （expected: 0、紅線 A）', v_forced;
  RAISE NOTICE '  ENABLED but 0 policy  ：% （expected: ~7、admin only / 待追）', v_zero_policy;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  -- 紅線 A 守門：workspaces 不准 FORCE
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'workspaces' AND c.relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION '紅線 A 違反：workspaces 被 FORCE RLS、會炸登入';
  END IF;

  -- 一般 FORCE 警告（5/13 預期 0、若偏離要追）
  IF v_forced > 0 THEN
    RAISE WARNING '偵測到 % 張 FORCE RLS 表（5/13 預期 0）、追 pg_class.relforcerowsecurity = true 看是哪幾張', v_forced;
  END IF;

  -- RLS 漏開警告
  IF v_enabled < v_total THEN
    RAISE WARNING '偵測到 % 張表 RLS 沒開（5/13 預期全開）、追原因', v_total - v_enabled;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. 給非標準 RLS pattern 的表加 COMMENT（schema query 看得到）
-- ═══════════════════════════════════════════════════════════════════════════

-- 子表 inherited pattern（透過 parent 對應 workspace）
COMMENT ON TABLE public.payment_request_items IS
  'RLS pattern: inherited（setup_inherited_rls）、透過 payment_requests.workspace_id 守門。5/13 從 FORCE 收回。';

-- 員工 join 表（透過 employees 對應 workspace）
COMMENT ON TABLE public.employee_branches IS
  'RLS pattern: join_table（setup_join_table_rls）、透過 employees.workspace_id 守門。5/13 補 4 條 policy。';

COMMENT ON TABLE public.employee_brands IS
  'RLS pattern: join_table（setup_join_table_rls）、透過 employees.workspace_id 守門。5/13 補 4 條 policy。';

COMMENT ON TABLE public.employee_departments IS
  'RLS pattern: join_table（setup_join_table_rls）、透過 employees.workspace_id 守門。5/13 補 4 條 policy。';

-- 紅線 B：image_library created_by FK 改指 employees
COMMENT ON TABLE public.image_library IS
  'RLS pattern: workspace_scoped。紅線 B（5/13）：created_by FK → employees(id) ON DELETE SET NULL。';

-- 紅線 A：workspaces 不准 FORCE
COMMENT ON TABLE public.workspaces IS
  'RLS pattern: workspace 平等。紅線 A：永遠 NO FORCE（FORCE 會炸登入、4/20 出過事故）。';

-- 系統表（無 user-facing、admin only）
COMMENT ON TABLE public.api_usage IS
  'RLS pattern: admin only（0 user policy、service_role 寫）。';

COMMENT ON TABLE public.cron_execution_logs IS
  'RLS pattern: admin only（0 user policy、service_role 寫）。';

COMMENT ON TABLE public.webhook_idempotency_keys IS
  'RLS pattern: admin only（0 user policy、service_role 寫）。';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 完工驗證：apply 後可以 SELECT obj_description 看 COMMENT
--   SELECT obj_description('public.payment_request_items'::regclass);
--
-- 跟 docs/db-state-snapshot-2026-05-13.md 配套、Markdown 給人讀、SQL 給機器讀。
-- ─────────────────────────────────────────────────────────────────────────────
