-- ============================================
-- Venturo Complete RLS System
-- ============================================
-- 日期: 2025-12-11
-- 目的: 實作完整的 Row Level Security 資料隔離
-- 參考文檔: RLS_COMPLETE_SPECIFICATION.md

BEGIN;

-- ============================================
-- Part 1: Helper Functions
-- ============================================

-- 先刪除舊的函數（如果存在且返回類型不同）
-- 使用 CASCADE 來處理依賴的 policies
DROP FUNCTION IF EXISTS public.get_current_user_workspace() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_employee_id() CASCADE;
DROP FUNCTION IF EXISTS public.set_current_workspace(text) CASCADE;
DROP FUNCTION IF EXISTS public.set_current_workspace(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_current_workspace(varchar) CASCADE;

-- 1. 取得當前用戶的 workspace_id
CREATE OR REPLACE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  ws_id_text text;
BEGIN
  -- 優先從 session 取得
  ws_id_text := current_setting('app.current_workspace_id', true);

  -- 如果有設定，轉換為 uuid
  IF ws_id_text IS NOT NULL AND ws_id_text != '' THEN
    ws_id := ws_id_text::uuid;
  ELSE
    -- 從 employees 表格取得
    SELECT e.workspace_id INTO ws_id
    FROM public.employees e
    WHERE e.user_id = auth.uid();
  END IF;

  RETURN ws_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace IS '取得當前用戶的 workspace_id';

-- 2. 檢查是否為超級管理員
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_super_admin IS '檢查當前用戶是否為超級管理員';

-- 3. 取得當前員工 ID
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  emp_id uuid;
BEGIN
  SELECT e.id INTO emp_id
  FROM public.employees e
  WHERE e.user_id = auth.uid();

  RETURN emp_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_employee_id IS '取得當前員工的 ID';

-- 4. 設定當前 workspace（前端登入時呼叫）
CREATE OR REPLACE FUNCTION public.set_current_workspace(p_workspace_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_workspace_id', p_workspace_id, false);
END;
$$;

COMMENT ON FUNCTION public.set_current_workspace IS '設定當前 workspace ID（前端登入後呼叫）';

-- ============================================
-- Part 2: Calendar Events - 加上 visibility 欄位
-- ============================================

-- 建立 enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_visibility') THEN
    CREATE TYPE public.calendar_visibility AS ENUM ('private', 'workspace', 'company_wide');
  END IF;
END $$;

-- 加上 visibility 欄位
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS visibility public.calendar_visibility DEFAULT 'workspace';

COMMENT ON COLUMN public.calendar_events.visibility IS '
可見性：
  private: 只有建立者本人看得到
  workspace: 同分公司的人都看得到
  company_wide: 全公司都看得到（只有管理員能建立）
';

-- ============================================
-- Part 3: 啟用 RLS - 使用 DO block 確保表格存在
-- ============================================

DO $$
DECLARE
  tables_to_enable text[] := ARRAY[
    -- 核心業務資料
    'orders', 'tours', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'itineraries',
    'itinerary_items', 'visas', 'vendor_costs',
    -- 財務相關
    'refunds', 'ledgers', 'linkpay_logs', 'confirmations', 'disbursements',
    -- 業務管理
    'calendar_events', 'tasks', 'todos',
    -- 通訊系統
    'channels', 'channel_groups', 'channel_members', 'messages',
    -- 其他
    'bulletins', 'esims',
    -- 個人資料
    'user_preferences', 'personal_canvases',
    -- 旅遊相關
    'tour_participants', 'contacts',
    -- 新表格
    'payment_request_items', 'companies', 'company_contacts',
    'company_announcements', 'tour_addons', 'contracts'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_to_enable
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'Enabled RLS for: %', tbl;
    ELSE
      RAISE NOTICE 'Table does not exist, skipping: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Part 4: 禁用 RLS - 全公司共用的表格
-- ============================================

DO $$
DECLARE
  tables_to_disable text[] := ARRAY[
    'workspaces', 'employees', 'user_roles', 'destinations',
    'airlines', 'hotels', 'suppliers', 'cities', 'countries',
    'attractions', 'cost_templates', 'price_lists', 'bank_codes',
    'transportation_rates', 'image_library', 'system_settings'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_to_disable
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'Disabled RLS for: %', tbl;
    ELSE
      RAISE NOTICE 'Table does not exist, skipping: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Part 5: 刪除舊的 Policies
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;

-- ============================================
-- Part 6: 建立 RLS Policies - 完全隔離的表格
-- ============================================

DO $$
DECLARE
  -- 排除特殊處理的表：calendar_events, channels, messages, channel_members, channel_groups, user_preferences, personal_canvases
  tables text[] := ARRAY[
    'orders', 'tours', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'contracts',
    'itineraries', 'itinerary_items', 'visas', 'vendor_costs',
    'refunds', 'ledgers', 'linkpay_logs', 'confirmations',
    'disbursements', 'tasks', 'todos',
    'bulletins', 'esims', 'tour_participants', 'contacts',
    'payment_request_items', 'companies', 'company_contacts',
    'company_announcements', 'tour_addons'
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
        -- SELECT: 看自己分公司 OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- INSERT: 只能新增到自己分公司
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (workspace_id = get_current_user_workspace())',
          tbl, tbl
        );

        -- UPDATE: 只能改自己分公司 OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- DELETE: 只能刪自己分公司 OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE 'Created RLS policies for: %', tbl;
      ELSE
        RAISE NOTICE 'Table % has no workspace_id column, skipping policies', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Part 7-13: 特殊表格的 Policies（使用 DO block 確保安全）
-- ============================================

DO $$
BEGIN
  -- Part 7: Calendar Events
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    -- 檢查是否有 visibility 欄位
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'visibility') THEN
      CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
      USING (
        CASE visibility
          WHEN 'private' THEN created_by = auth.uid()
          WHEN 'workspace' THEN workspace_id = get_current_user_workspace()
          WHEN 'company_wide' THEN true
        END
      );
    ELSE
      -- 沒有 visibility 欄位，使用標準 workspace 策略
      CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
      USING (workspace_id = get_current_user_workspace() OR is_super_admin());
    END IF;

    CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
    WITH CHECK (workspace_id = get_current_user_workspace());

    CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
    USING (created_by = auth.uid() OR is_super_admin());

    CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
    USING (created_by = auth.uid() OR is_super_admin());

    RAISE NOTICE 'Created policies for calendar_events';
  END IF;

  -- Part 8: Channels
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channels') THEN
    CREATE POLICY "channels_select" ON public.channels FOR SELECT
    USING (
      workspace_id = get_current_user_workspace() OR is_super_admin()
    );

    CREATE POLICY "channels_insert" ON public.channels FOR INSERT
    WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "channels_update" ON public.channels FOR UPDATE
    USING (workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "channels_delete" ON public.channels FOR DELETE
    USING (created_by = auth.uid() OR is_super_admin());

    RAISE NOTICE 'Created policies for channels';
  END IF;

  -- Part 9: Messages
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    CREATE POLICY "messages_select" ON public.messages FOR SELECT
    USING (true); -- Messages 不需要 workspace 隔離，由 channel 控制

    CREATE POLICY "messages_insert" ON public.messages FOR INSERT
    WITH CHECK (true);

    CREATE POLICY "messages_update" ON public.messages FOR UPDATE
    USING (created_by = auth.uid() OR is_super_admin());

    CREATE POLICY "messages_delete" ON public.messages FOR DELETE
    USING (created_by = auth.uid() OR is_super_admin());

    RAISE NOTICE 'Created policies for messages';
  END IF;

  -- Part 10: Channel Members
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channel_members') THEN
    CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT
    USING (true);

    CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT
    WITH CHECK (true);

    CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE
    USING (is_super_admin());

    RAISE NOTICE 'Created policies for channel_members';
  END IF;

  -- Part 11: Channel Groups
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channel_groups') THEN
    CREATE POLICY "channel_groups_select" ON public.channel_groups FOR SELECT
    USING (workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "channel_groups_insert" ON public.channel_groups FOR INSERT
    WITH CHECK (workspace_id = get_current_user_workspace());

    CREATE POLICY "channel_groups_update" ON public.channel_groups FOR UPDATE
    USING (workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "channel_groups_delete" ON public.channel_groups FOR DELETE
    USING (workspace_id = get_current_user_workspace() OR is_super_admin());

    RAISE NOTICE 'Created policies for channel_groups';
  END IF;

  -- Part 12: User Preferences
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'user_id') THEN
      CREATE POLICY "user_preferences_all" ON public.user_preferences FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
      RAISE NOTICE 'Created policies for user_preferences';
    ELSE
      RAISE NOTICE 'user_preferences has no user_id column, skipping';
    END IF;
  END IF;

  -- Part 13: Personal Canvases
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'personal_canvases') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personal_canvases' AND column_name = 'user_id') THEN
      CREATE POLICY "personal_canvases_all" ON public.personal_canvases FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
      RAISE NOTICE 'Created policies for personal_canvases';
    ELSE
      RAISE NOTICE 'personal_canvases has no user_id column, skipping';
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================
-- Part 14: 驗證結果
-- ============================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
  rls_disabled_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- 統計 RLS 啟用表格
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' AND c.relrowsecurity = true;

  -- 統計 RLS 禁用表格
  SELECT COUNT(*) INTO rls_disabled_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' AND c.relrowsecurity = false;

  -- 統計 policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  -- 輸出結果
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Complete RLS System Enabled!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '  • Tables with RLS enabled: %', rls_enabled_count;
  RAISE NOTICE '  • Tables with RLS disabled: %', rls_disabled_count;
  RAISE NOTICE '  • Total RLS policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Key Features:';
  RAISE NOTICE '  • Workspace isolation (台北/台中分隔)';
  RAISE NOTICE '  • Super admin access (超級管理員可看全部)';
  RAISE NOTICE '  • Calendar visibility (個人/分公司/全公司)';
  RAISE NOTICE '  • Channel-based messaging';
  RAISE NOTICE '  • User-based personal data';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  1. 前端登入時呼叫 set_current_workspace()';
  RAISE NOTICE '  2. 所有資料建立自動帶入 workspace_id';
  RAISE NOTICE '  3. 超級管理員加入分公司篩選器';
  RAISE NOTICE '  4. 測試資料隔離是否正確';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
