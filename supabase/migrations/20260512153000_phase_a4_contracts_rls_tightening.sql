-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A4: 收緊 contracts 表 RLS policy（PR-1）
--
-- 背景：
--   2026-05-12 William 拍板 PR-1「補 5 張表 RLS」、Logan 寫好原 migration
--   要 ENABLE customers / suppliers / payments / contracts / travel_invoices。
--
--   apply 前 pre-check production state、發現：
--   - customers ✅ 已 RLS ENABLED、4 條 policy 正確（workspace_id 比對、無 NULL bypass）
--   - suppliers ✅ 已 RLS ENABLED、4 條 policy 正確
--   - contracts ⚠️ 已 RLS ENABLED、但 policy 有兩個洞：
--                a) SELECT/UPDATE/DELETE 含 `workspace_id IS NULL OR ...` NULL bypass
--                b) INSERT 是 `WITH CHECK true` — 任何 user 可插入任何 workspace
--   - payments ❌ 表不存在
--   - travel_invoices ❌ 表不存在（之前 drop_travel_invoices_ghost_house migration 砍）
--
--   原本 5 張表的 audit 是基於 migration files 推測、跟 production 不符。
--   結論：PR-1 真正要做的只剩 contracts 4 條 policy 收緊。
--
-- 風險評估：
--   - contracts: 10 row、0 NULL workspace、全部在 workspace a89335d4
--     → 移除 NULL bypass 不影響任何現存 row（沒 NULL 的）
--     → 收緊 INSERT 不影響現存 row（只擋未來不當寫入）
--   - LOW risk
--
-- ⚠️ 紅線檢核（CLAUDE.md 紅線 A）：
--   - 不動 workspaces 表 ✓
--   - 不動 admin bypass / is_super_admin ✓
--   - apply 後仍須跑 login-api e2e 確認登入不炸
--
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- Pre-check：contracts 表存在 + 沒 NULL workspace_id
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_null_count INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE workspace_id IS NULL)
  INTO v_total, v_null_count
  FROM public.contracts;

  RAISE NOTICE 'contracts pre-check: total=%, null_workspace=%', v_total, v_null_count;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION
      'contracts 有 % 筆 workspace_id IS NULL 的 row、apply 前必須先 backfill',
      v_null_count;
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Drop 既有 contracts policy（4 條：select/insert/update/delete）
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contracts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contracts', r.policyname);
    RAISE NOTICE '  ↳ dropped policy contracts.%', r.policyname;
  END LOOP;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 重建 contracts policy（收緊版、跟 customers / suppliers 一致）
-- ═════════════════════════════════════════════════════════════════════════════

-- 確認 RLS 已 ENABLED（idempotent、production 已開、再執行無害）
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_select ON public.contracts FOR SELECT
  TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

CREATE POLICY contracts_insert ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());

CREATE POLICY contracts_update ON public.contracts FOR UPDATE
  TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

CREATE POLICY contracts_delete ON public.contracts FOR DELETE
  TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- ═════════════════════════════════════════════════════════════════════════════
-- 完工驗證
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_has_null_bypass INTEGER;
  v_has_loose_insert INTEGER;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE oid = 'public.contracts'::regclass;

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'contracts';

  -- 確認沒有殘留 NULL bypass policy
  SELECT COUNT(*) INTO v_has_null_bypass
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'contracts'
    AND qual LIKE '%workspace_id IS NULL%';

  -- 確認 INSERT policy 不是 'true'
  SELECT COUNT(*) INTO v_has_loose_insert
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'contracts'
    AND cmd = 'INSERT' AND with_check = 'true';

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION '驗證失敗：contracts RLS 沒 ENABLED';
  END IF;

  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION '驗證失敗：contracts policy 數量 = %、預期 4', v_policy_count;
  END IF;

  IF v_has_null_bypass > 0 THEN
    RAISE EXCEPTION '驗證失敗：contracts 仍有 % 條含 NULL bypass 的 policy', v_has_null_bypass;
  END IF;

  IF v_has_loose_insert > 0 THEN
    RAISE EXCEPTION '驗證失敗：contracts 仍有 WITH CHECK true 的 INSERT policy';
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Phase A4 完成：contracts RLS 收緊';
  RAISE NOTICE '  - RLS ENABLED';
  RAISE NOTICE '  - 4 條 policy (select/insert/update/delete)';
  RAISE NOTICE '  - 移除 NULL workspace bypass';
  RAISE NOTICE '  - INSERT 收緊為 workspace_id = current_user_workspace';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
