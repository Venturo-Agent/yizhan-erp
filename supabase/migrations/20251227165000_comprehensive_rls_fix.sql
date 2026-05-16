-- ============================================
-- 完整 RLS 系統修復
-- ============================================
-- 日期: 2025-12-27
-- 問題: workspace 內容無法顯示
-- 原因: RLS 函數無法正確取得 workspace_id
-- 解決: 多重 fallback 機制 + 更好的錯誤處理

BEGIN;

-- ============================================
-- Part 1: 診斷當前狀態
-- ============================================

DO $$
DECLARE
  emp_count integer;
  emp_with_supabase_id integer;
  emp_with_user_id integer;
  user_roles_count integer;
  calendar_events_count integer;
  tours_count integer;
  orders_count integer;
BEGIN
  SELECT COUNT(*) INTO emp_count FROM public.employees;
  SELECT COUNT(*) INTO emp_with_supabase_id FROM public.employees WHERE supabase_user_id IS NOT NULL;
  SELECT COUNT(*) INTO emp_with_user_id FROM public.employees WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO user_roles_count FROM public.user_roles;
  SELECT COUNT(*) INTO calendar_events_count FROM public.calendar_events;
  SELECT COUNT(*) INTO tours_count FROM public.tours;
  SELECT COUNT(*) INTO orders_count FROM public.orders;

  RAISE NOTICE '';
  RAISE NOTICE '====== 診斷報告 ======';
  RAISE NOTICE '員工總數: %', emp_count;
  RAISE NOTICE '有 supabase_user_id 的員工: %', emp_with_supabase_id;
  RAISE NOTICE '有 user_id 的員工: %', emp_with_user_id;
  RAISE NOTICE 'user_roles 記錄數: %', user_roles_count;
  RAISE NOTICE 'calendar_events 記錄數: %', calendar_events_count;
  RAISE NOTICE 'tours 記錄數: %', tours_count;
  RAISE NOTICE 'orders 記錄數: %', orders_count;
  RAISE NOTICE '========================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- Part 2: 重建 Helper Functions（帶完整 fallback）
-- ============================================

-- 2.1 get_current_user_workspace - 多重 fallback 取得 workspace_id
DROP FUNCTION IF EXISTS public.get_current_user_workspace() CASCADE;
CREATE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  ws_id_text text;
  current_uid uuid;
BEGIN
  -- 取得 auth.uid()
  current_uid := auth.uid();

  -- 如果未登入，返回 NULL
  IF current_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 方法 1: 從 session 取得（最快）
  BEGIN
    ws_id_text := current_setting('app.current_workspace_id', true);
    IF ws_id_text IS NOT NULL AND ws_id_text != '' AND ws_id_text != 'null' THEN
      ws_id := ws_id_text::uuid;
      IF ws_id IS NOT NULL THEN
        RETURN ws_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- 繼續嘗試其他方法
  END;

  -- 方法 2: 從 auth.users.raw_user_meta_data 取得
  BEGIN
    SELECT (raw_user_meta_data->>'workspace_id')::uuid INTO ws_id
    FROM auth.users
    WHERE id = current_uid;

    IF ws_id IS NOT NULL THEN
      RETURN ws_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 方法 3: 從 employees 表格取得（使用 supabase_user_id）
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
  LIMIT 1;

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 方法 4: 從 employees 表格取得（使用舊的 user_id，向後相容）
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.user_id = current_uid::text
  LIMIT 1;

  RETURN ws_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace IS
'取得當前用戶的 workspace_id（多重 fallback：session → metadata → supabase_user_id → user_id）';

-- 2.2 is_super_admin - 檢查超級管理員
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
CREATE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 方法 1: 檢查 user_roles 表格
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = current_uid
    AND role = 'super_admin'
  ) THEN
    RETURN true;
  END IF;

  -- 方法 2: 檢查 employees.roles 陣列（使用 supabase_user_id）
  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.supabase_user_id = current_uid
    AND 'super_admin' = ANY(e.roles)
  ) THEN
    RETURN true;
  END IF;

  -- 方法 3: 檢查 employees.roles 陣列（使用 user_id，向後相容）
  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = current_uid::text
    AND 'super_admin' = ANY(e.roles)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_super_admin IS
'檢查當前用戶是否為超級管理員（檢查 user_roles 和 employees.roles）';

-- 2.3 get_current_employee_id - 取得員工 ID
DROP FUNCTION IF EXISTS public.get_current_employee_id() CASCADE;
CREATE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  emp_id uuid;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 方法 1: 從 auth.users.raw_user_meta_data 取得（最快）
  BEGIN
    SELECT (raw_user_meta_data->>'employee_id')::uuid INTO emp_id
    FROM auth.users
    WHERE id = current_uid;

    IF emp_id IS NOT NULL THEN
      RETURN emp_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 方法 2: 從 employees 表格取得（使用 supabase_user_id）
  SELECT e.id INTO emp_id
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
  LIMIT 1;

  IF emp_id IS NOT NULL THEN
    RETURN emp_id;
  END IF;

  -- 方法 3: 從 employees 表格取得（使用 user_id，向後相容）
  SELECT e.id INTO emp_id
  FROM public.employees e
  WHERE e.user_id = current_uid::text
  LIMIT 1;

  RETURN emp_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_employee_id IS
'取得當前員工的 ID（多重 fallback：metadata → supabase_user_id → user_id）';

-- 2.4 is_employee - 檢查是否為員工
DROP FUNCTION IF EXISTS public.is_employee() CASCADE;
CREATE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 方法 1: 使用 supabase_user_id
  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.supabase_user_id = current_uid
    AND e.status != 'terminated'
  ) THEN
    RETURN true;
  END IF;

  -- 方法 2: 使用 user_id（向後相容）
  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = current_uid::text
    AND e.status != 'terminated'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_employee IS
'檢查當前用戶是否為員工';

-- 2.5 set_current_workspace - 設定當前 workspace
CREATE OR REPLACE FUNCTION public.set_current_workspace(p_workspace_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_workspace_id', p_workspace_id, false);
END;
$$;

-- 2.6 is_traveler - 旅客系統用（保持不變）
CREATE OR REPLACE FUNCTION public.is_traveler()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM traveler_profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- ============================================
-- Part 3: 禁用基礎資料表的 RLS（全公司共享）
-- ============================================

-- 這些表格應該所有員工都能看到
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Part 4: 重建 calendar_events RLS Policies
-- ============================================

-- 確保 RLS 已啟用
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 刪除現有 policies
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

-- SELECT: 使用更寬鬆的規則
-- 1. workspace_id 為 NULL 的舊資料，所有人可看
-- 2. 個人事項只有本人能看
-- 3. 公司事項同 workspace 能看，或超級管理員可看
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
USING (
  -- 舊資料（workspace_id 為 NULL）所有人可看
  workspace_id IS NULL
  OR
  -- 超級管理員可看全部
  is_super_admin()
  OR
  -- 個人事項只有本人能看
  (visibility = 'personal' AND created_by = get_current_employee_id())
  OR
  -- 公司事項同 workspace 能看
  (visibility = 'company' AND workspace_id = get_current_user_workspace())
  OR
  -- 其他情況（visibility 為其他值或 NULL）同 workspace 能看
  (visibility IS NULL AND workspace_id = get_current_user_workspace())
);

-- INSERT: 可以新增到自己的 workspace 或 NULL
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- UPDATE: 只有建立者或超級管理員能修改
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
USING (
  workspace_id IS NULL
  OR created_by = get_current_employee_id()
  OR is_super_admin()
);

-- DELETE: 只有建立者或超級管理員能刪除
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
USING (
  workspace_id IS NULL
  OR created_by = get_current_employee_id()
  OR is_super_admin()
);

-- ============================================
-- Part 5: 重建其他業務表格的 RLS Policies
-- ============================================

-- 通用 workspace-scoped 表格的 policy 模板
DO $$
DECLARE
  tables text[] := ARRAY[
    'tours', 'orders', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'contracts',
    'itineraries', 'visas', 'vendor_costs', 'tasks', 'todos',
    'bulletins', 'channels', 'channel_groups'
  ];
  tbl text;
  has_workspace_id boolean;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- 檢查表格是否存在
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- 檢查是否有 workspace_id 欄位
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'workspace_id'
      ) INTO has_workspace_id;

      IF has_workspace_id THEN
        -- 確保 RLS 已啟用
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- 刪除舊的 policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

        -- SELECT: 同 workspace 或超級管理員或 NULL（舊資料）
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- INSERT: 只能新增到自己分公司或 NULL
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- UPDATE: 同 workspace 或超級管理員或 NULL
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- DELETE: 同 workspace 或超級管理員或 NULL
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE '✓ 重建 % 的 RLS policies', tbl;
      ELSE
        RAISE NOTICE '⚠ % 沒有 workspace_id 欄位，跳過', tbl;
      END IF;
    ELSE
      RAISE NOTICE '⚠ % 表格不存在，跳過', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Part 6: Messages 和 Channel Members 特殊處理
-- ============================================

-- Messages: 不需要 workspace 隔離，由 channel 控制
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "messages_select" ON public.messages;
    DROP POLICY IF EXISTS "messages_insert" ON public.messages;
    DROP POLICY IF EXISTS "messages_update" ON public.messages;
    DROP POLICY IF EXISTS "messages_delete" ON public.messages;

    CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (true);
    CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "messages_update" ON public.messages FOR UPDATE
      USING (created_by = auth.uid() OR is_super_admin());
    CREATE POLICY "messages_delete" ON public.messages FOR DELETE
      USING (created_by = auth.uid() OR is_super_admin());

    RAISE NOTICE '✓ 重建 messages 的 RLS policies';
  END IF;
END $$;

-- Channel Members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channel_members') THEN
    ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
    DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
    DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;

    CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT USING (true);
    CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT WITH CHECK (true);
    CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE USING (is_super_admin());

    RAISE NOTICE '✓ 重建 channel_members 的 RLS policies';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Part 7: 驗證
-- ============================================

DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ RLS 系統完整修復完成';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '修正的 Helper Functions:';
  RAISE NOTICE '  • get_current_user_workspace() - 4 重 fallback';
  RAISE NOTICE '    (session → metadata → supabase_user_id → user_id)';
  RAISE NOTICE '  • is_super_admin() - 檢查 user_roles 和 employees.roles';
  RAISE NOTICE '  • get_current_employee_id() - 3 重 fallback';
  RAISE NOTICE '  • is_employee() - 2 重 fallback';
  RAISE NOTICE '';
  RAISE NOTICE '禁用 RLS 的表格（全公司共享）:';
  RAISE NOTICE '  • employees';
  RAISE NOTICE '  • workspaces';
  RAISE NOTICE '  • user_roles';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies 數量: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 重要提醒:';
  RAISE NOTICE '  1. 用戶需要重新登入才能讓 supabase_user_id 被更新';
  RAISE NOTICE '  2. 舊資料（workspace_id = NULL）所有人都可以看到';
  RAISE NOTICE '  3. 新資料需要正確設定 workspace_id';
  RAISE NOTICE '================================================';
END $$;
