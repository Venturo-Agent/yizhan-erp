-- ============================================
-- Fix Calendar Events RLS
-- ============================================
-- 日期: 2025-12-12
-- 問題: 舊的行事曆事件沒有 workspace_id，被 RLS 擋住
-- 解決: 允許 workspace_id IS NULL 的舊資料

BEGIN;

-- 刪除現有的 calendar_events policies
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

-- 重新建立 SELECT policy（允許 NULL workspace_id）
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
USING (
  -- 允許以下情況查看：
  -- 1. workspace_id 為 NULL（舊資料）
  -- 2. workspace_id 符合當前用戶的 workspace
  -- 3. 超級管理員
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- INSERT policy（新資料必須有 workspace_id）
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
WITH CHECK (
  workspace_id = get_current_user_workspace()
  OR workspace_id IS NULL  -- 允許不帶 workspace_id（向後相容）
);

-- UPDATE policy（只能改自己建立的或超級管理員）
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
USING (
  created_by = auth.uid()
  OR is_super_admin()
  OR workspace_id IS NULL  -- 允許修改舊資料
);

-- DELETE policy
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
USING (
  created_by = auth.uid()
  OR is_super_admin()
  OR workspace_id IS NULL  -- 允許刪除舊資料
);

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✅ Calendar Events RLS 已修正';
  RAISE NOTICE '  • 允許 workspace_id IS NULL 的舊資料';
  RAISE NOTICE '  • 新資料會自動帶入 workspace_id';
END $$;
