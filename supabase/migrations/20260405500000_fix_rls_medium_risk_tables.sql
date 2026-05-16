-- ============================================================================
-- 中風險表格 RLS 修復
-- ============================================================================
-- 日期: 2026-04-05
-- 目的: 為中風險表格升級 RLS 政策，從 auth-only 提升到 workspace 隔離
--
-- 修復範圍:
--   1. accounting_accounts — 無 workspace_id，透過 user_id 對應 employees 取 workspace
--   2. accounting_entries — 無 workspace_id，透過 tour_id 對應 tours 取 workspace
--   3. tour_rooms — 無 workspace_id，透過 tour_id 對應 tours 取 workspace
--   4. tour_room_assignments — 無 workspace_id，透過 room_id → tour_rooms → tours 取 workspace
--   5. supplier_categories — 共用查找表，保持 auth-only（無 workspace_id）
--   6. tour_leaders — 共用領隊資料，保持 auth-only（無 workspace_id）
--   7. files — 加入 is_super_admin() 支援
--   8. folders — 加入 is_super_admin() 支援
--   9. workspace_modules — 啟用 RLS + workspace 隔離
--  10. tour_itinerary_items — 已有 workspace_id，確保政策正確
--  11. companies — 啟用 RLS + workspace 隔離（workspace_id 可為 NULL）
--  12. attractions — 啟用 RLS + workspace 隔離（workspace_id 可為 NULL）
--  13. workspaces — 啟用 RLS，用戶只能看自己的 workspace
-- ============================================================================


-- ============================================================================
-- 1. accounting_accounts — 透過 user_id 對應 employees.supabase_user_id 取 workspace
-- ============================================================================
-- accounting_accounts.user_id 存的是 auth.uid()，對應 employees.supabase_user_id

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_accounts_authenticated" ON public.accounting_accounts;
DROP POLICY IF EXISTS "accounting_accounts_select" ON public.accounting_accounts;
DROP POLICY IF EXISTS "accounting_accounts_insert" ON public.accounting_accounts;
DROP POLICY IF EXISTS "accounting_accounts_update" ON public.accounting_accounts;
DROP POLICY IF EXISTS "accounting_accounts_delete" ON public.accounting_accounts;

-- SELECT: 只看自己建立的帳戶，或超級管理員看全部
CREATE POLICY "accounting_accounts_select" ON public.accounting_accounts
  FOR SELECT TO authenticated
  USING (
    user_id::uuid = auth.uid()
    OR is_super_admin()
  );

-- INSERT: 只能以自己的 user_id 建立
CREATE POLICY "accounting_accounts_insert" ON public.accounting_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id::uuid = auth.uid()
  );

-- UPDATE: 只能改自己的帳戶，或超級管理員
CREATE POLICY "accounting_accounts_update" ON public.accounting_accounts
  FOR UPDATE TO authenticated
  USING (
    user_id::uuid = auth.uid()
    OR is_super_admin()
  );

-- DELETE: 只能刪自己的帳戶，或超級管理員
CREATE POLICY "accounting_accounts_delete" ON public.accounting_accounts
  FOR DELETE TO authenticated
  USING (
    user_id::uuid = auth.uid()
    OR is_super_admin()
  );

-- ============================================================================
-- 2. accounting_entries — 透過 tour_id 對應 tours.workspace_id
-- ============================================================================
-- 有些 entry 可能沒有 tour_id（一般記帳），用 recorded_by 做備援

ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_entries_authenticated" ON public.accounting_entries;
DROP POLICY IF EXISTS "accounting_entries_select" ON public.accounting_entries;
DROP POLICY IF EXISTS "accounting_entries_insert" ON public.accounting_entries;
DROP POLICY IF EXISTS "accounting_entries_update" ON public.accounting_entries;
DROP POLICY IF EXISTS "accounting_entries_delete" ON public.accounting_entries;

-- SELECT: 透過 tour_id 查 workspace，或無 tour_id 時看 recorded_by 是否同 workspace
CREATE POLICY "accounting_entries_select" ON public.accounting_entries
  FOR SELECT TO authenticated
  USING (
    (
      tour_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tours t
        WHERE t.id = accounting_entries.tour_id
          AND t.workspace_id = get_current_user_workspace()
      )
    )
    OR (
      tour_id IS NULL
      AND recorded_by::uuid = auth.uid()
    )
    OR is_super_admin()
  );

-- INSERT: 同上邏輯
CREATE POLICY "accounting_entries_insert" ON public.accounting_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      tour_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tours t
        WHERE t.id = accounting_entries.tour_id
          AND t.workspace_id = get_current_user_workspace()
      )
    )
    OR (
      tour_id IS NULL
      AND recorded_by::uuid = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "accounting_entries_update" ON public.accounting_entries
  FOR UPDATE TO authenticated
  USING (
    (
      tour_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tours t
        WHERE t.id = accounting_entries.tour_id
          AND t.workspace_id = get_current_user_workspace()
      )
    )
    OR (
      tour_id IS NULL
      AND recorded_by::uuid = auth.uid()
    )
    OR is_super_admin()
  );

-- DELETE
CREATE POLICY "accounting_entries_delete" ON public.accounting_entries
  FOR DELETE TO authenticated
  USING (
    (
      tour_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tours t
        WHERE t.id = accounting_entries.tour_id
          AND t.workspace_id = get_current_user_workspace()
      )
    )
    OR (
      tour_id IS NULL
      AND recorded_by::uuid = auth.uid()
    )
    OR is_super_admin()
  );

-- ============================================================================
-- 3. tour_rooms — 透過 tour_id 對應 tours.workspace_id
-- ============================================================================

ALTER TABLE public.tour_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_rooms FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_rooms_authenticated" ON public.tour_rooms;
DROP POLICY IF EXISTS "tour_rooms_select" ON public.tour_rooms;
DROP POLICY IF EXISTS "tour_rooms_insert" ON public.tour_rooms;
DROP POLICY IF EXISTS "tour_rooms_update" ON public.tour_rooms;
DROP POLICY IF EXISTS "tour_rooms_delete" ON public.tour_rooms;

CREATE POLICY "tour_rooms_select" ON public.tour_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_rooms.tour_id
        AND t.workspace_id = get_current_user_workspace()
    )
    OR is_super_admin()
  );

CREATE POLICY "tour_rooms_insert" ON public.tour_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_rooms.tour_id
        AND t.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "tour_rooms_update" ON public.tour_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_rooms.tour_id
        AND t.workspace_id = get_current_user_workspace()
    )
    OR is_super_admin()
  );

CREATE POLICY "tour_rooms_delete" ON public.tour_rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_rooms.tour_id
        AND t.workspace_id = get_current_user_workspace()
    )
    OR is_super_admin()
  );

-- ============================================================================
-- 4. tour_room_assignments — 透過 room_id → tour_rooms.tour_id → tours.workspace_id
-- ============================================================================

ALTER TABLE public.tour_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_room_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_room_assignments_authenticated" ON public.tour_room_assignments;
DROP POLICY IF EXISTS "tour_room_assignments_select" ON public.tour_room_assignments;
DROP POLICY IF EXISTS "tour_room_assignments_insert" ON public.tour_room_assignments;
DROP POLICY IF EXISTS "tour_room_assignments_update" ON public.tour_room_assignments;
DROP POLICY IF EXISTS "tour_room_assignments_delete" ON public.tour_room_assignments;

CREATE POLICY "tour_room_assignments_select" ON public.tour_room_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tour_rooms tr
      JOIN public.tours t ON t.id = tr.tour_id
      WHERE tr.id = tour_room_assignments.room_id
        AND t.workspace_id = get_current_user_workspace()
    )
    OR is_super_admin()
  );

CREATE POLICY "tour_room_assignments_insert" ON public.tour_room_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tour_rooms tr
      JOIN public.tours t ON t.id = tr.tour_id
      WHERE tr.id = tour_room_assignments.room_id
        AND t.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "tour_room_assignments_update" ON public.tour_room_assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tour_rooms tr
      JOIN public.tours t ON t.id = tr.tour_id
      WHERE tr.id = tour_room_assignments.room_id
        AND t.workspace_id = get_current_user_workspace()
    )
    OR is_super_admin()
  );

CREATE POLICY "tour_room_assignments_delete" ON public.tour_room_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tour_rooms tr
      JOIN public.tours t ON t.id = tr.tour_id
      WHERE tr.id = tour_room_assignments.room_id
        AND t.workspace_id = get_current_user_workspace()
    )
    OR is_super_admin()
  );

-- ============================================================================
-- 5. supplier_categories — 共用查找表，無 workspace_id
-- ============================================================================
-- 供應商分類是全公司共用的基礎資料，保持 auth-only 但升級政策格式

ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_categories_authenticated" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_select" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_insert" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_update" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_delete" ON public.supplier_categories;

-- 所有認證用戶可讀（共用基礎資料）
CREATE POLICY "supplier_categories_select" ON public.supplier_categories
  FOR SELECT TO authenticated
  USING (true);

-- 只有超級管理員可寫入
CREATE POLICY "supplier_categories_insert" ON public.supplier_categories
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "supplier_categories_update" ON public.supplier_categories
  FOR UPDATE TO authenticated
  USING (is_super_admin());

CREATE POLICY "supplier_categories_delete" ON public.supplier_categories
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ============================================================================
-- 6. tour_leaders — 共用領隊資料，無 workspace_id
-- ============================================================================
-- 領隊是跨 workspace 共用的基礎資料，保持 auth-only

ALTER TABLE public.tour_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_leaders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_leaders_authenticated" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_select" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_insert" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_update" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_delete" ON public.tour_leaders;

-- 所有認證用戶可讀
CREATE POLICY "tour_leaders_select" ON public.tour_leaders
  FOR SELECT TO authenticated
  USING (true);

-- 所有認證用戶可寫（領隊由各分公司共同維護）
CREATE POLICY "tour_leaders_insert" ON public.tour_leaders
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "tour_leaders_update" ON public.tour_leaders
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "tour_leaders_delete" ON public.tour_leaders
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ============================================================================
-- 7 & 8. files + folders — 加入 is_super_admin() 支援
-- ============================================================================

-- --- files ---
DROP POLICY IF EXISTS "files_select" ON public.files;
DROP POLICY IF EXISTS "files_insert" ON public.files;
DROP POLICY IF EXISTS "files_update" ON public.files;
DROP POLICY IF EXISTS "files_delete" ON public.files;
DROP POLICY IF EXISTS "files_authenticated" ON public.files;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files FORCE ROW LEVEL SECURITY;

CREATE POLICY "files_select" ON public.files
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "files_insert" ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

CREATE POLICY "files_update" ON public.files
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "files_delete" ON public.files
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- --- folders ---
DROP POLICY IF EXISTS "folders_select" ON public.folders;
DROP POLICY IF EXISTS "folders_insert" ON public.folders;
DROP POLICY IF EXISTS "folders_update" ON public.folders;
DROP POLICY IF EXISTS "folders_delete" ON public.folders;
DROP POLICY IF EXISTS "folders_authenticated" ON public.folders;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders FORCE ROW LEVEL SECURITY;

CREATE POLICY "folders_select" ON public.folders
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "folders_insert" ON public.folders
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

CREATE POLICY "folders_update" ON public.folders
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "folders_delete" ON public.folders
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 9. workspace_modules — 啟用 RLS + workspace 隔離
-- ============================================================================

ALTER TABLE public.workspace_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_modules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_modules_authenticated" ON public.workspace_modules;
DROP POLICY IF EXISTS "workspace_modules_select" ON public.workspace_modules;
DROP POLICY IF EXISTS "workspace_modules_insert" ON public.workspace_modules;
DROP POLICY IF EXISTS "workspace_modules_update" ON public.workspace_modules;
DROP POLICY IF EXISTS "workspace_modules_delete" ON public.workspace_modules;

CREATE POLICY "workspace_modules_select" ON public.workspace_modules
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "workspace_modules_insert" ON public.workspace_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "workspace_modules_update" ON public.workspace_modules
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "workspace_modules_delete" ON public.workspace_modules
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 10. tour_itinerary_items — 已有 workspace_id，確保政策使用標準格式
-- ============================================================================

ALTER TABLE public.tour_itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_itinerary_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_itinerary_items_authenticated" ON public.tour_itinerary_items;
DROP POLICY IF EXISTS "tour_itinerary_items_select" ON public.tour_itinerary_items;
DROP POLICY IF EXISTS "tour_itinerary_items_insert" ON public.tour_itinerary_items;
DROP POLICY IF EXISTS "tour_itinerary_items_update" ON public.tour_itinerary_items;
DROP POLICY IF EXISTS "tour_itinerary_items_delete" ON public.tour_itinerary_items;

CREATE POLICY "tour_itinerary_items_select" ON public.tour_itinerary_items
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "tour_itinerary_items_insert" ON public.tour_itinerary_items
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

CREATE POLICY "tour_itinerary_items_update" ON public.tour_itinerary_items
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "tour_itinerary_items_delete" ON public.tour_itinerary_items
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 11. companies — 啟用 RLS + workspace 隔離（workspace_id 可為 NULL）
-- ============================================================================
-- companies.workspace_id 是 nullable，NULL 的資料視為共用（所有人可見）

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_authenticated" ON public.companies;
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
  );

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 12. attractions — 啟用 RLS + workspace 隔離（workspace_id 可為 NULL）
-- ============================================================================
-- attractions.workspace_id 是 nullable，NULL 的資料視為共用景點

ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attractions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attractions_authenticated" ON public.attractions;
DROP POLICY IF EXISTS "attractions_select" ON public.attractions;
DROP POLICY IF EXISTS "attractions_insert" ON public.attractions;
DROP POLICY IF EXISTS "attractions_update" ON public.attractions;
DROP POLICY IF EXISTS "attractions_delete" ON public.attractions;

CREATE POLICY "attractions_select" ON public.attractions
  FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "attractions_insert" ON public.attractions
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
  );

CREATE POLICY "attractions_update" ON public.attractions
  FOR UPDATE TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "attractions_delete" ON public.attractions
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 13. workspaces — 啟用 RLS，用戶只能看自己的 workspace
-- ============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces_authenticated" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;

-- SELECT: 用戶只能看自己所屬的 workspace，超級管理員看全部
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    id = get_current_user_workspace()
    OR is_super_admin()
  );

-- INSERT: 只有超級管理員可以建立新 workspace
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
  );

-- UPDATE: 只能改自己的 workspace，或超級管理員
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    id = get_current_user_workspace()
    OR is_super_admin()
  );

-- DELETE: 只有超級管理員可以刪除 workspace
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
  );


-- ============================================================================
-- 驗證結果
-- ============================================================================
DO $$
DECLARE
  target_tables text[] := ARRAY[
    'accounting_accounts', 'accounting_entries',
    'tour_rooms', 'tour_room_assignments',
    'supplier_categories', 'tour_leaders',
    'files', 'folders',
    'workspace_modules', 'tour_itinerary_items',
    'companies', 'attractions', 'workspaces'
  ];
  tbl text;
  rls_on boolean;
  policy_cnt integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '中風險表格 RLS 修復驗證結果';
  RAISE NOTICE '========================================';

  FOREACH tbl IN ARRAY target_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      SELECT c.relrowsecurity INTO rls_on
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl;

      SELECT COUNT(*) INTO policy_cnt
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl;

      RAISE NOTICE '  ✅ % — RLS: %, policies: %', tbl, rls_on, policy_cnt;
    ELSE
      RAISE NOTICE '  ❌ % — 表不存在', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
