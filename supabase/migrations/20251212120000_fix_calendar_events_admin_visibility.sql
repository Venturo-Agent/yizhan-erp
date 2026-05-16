-- ============================================
-- Fix Calendar Events Admin Visibility
-- ============================================
-- 日期: 2025-12-12
-- 需求: 超級管理員可以看到所有公司的行事曆，但個人事項還是只有本人能看

BEGIN;

-- 刪除現有的 calendar_events policies
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

-- SELECT policy:
-- 1. 個人事項 (visibility = 'personal'): 只有建立者本人能看
-- 2. 公司事項 (visibility = 'company'):
--    - 同 workspace 的人能看
--    - 超級管理員能看所有公司的
-- 3. 舊資料 (workspace_id IS NULL): 所有人都能看
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
USING (
  CASE
    -- 個人事項：只有本人能看（超級管理員也不能看別人的個人事項）
    WHEN visibility = 'personal' THEN created_by = auth.uid()
    -- 公司事項：同 workspace 或超級管理員
    WHEN visibility = 'company' THEN
      workspace_id = get_current_user_workspace()
      OR is_super_admin()
    -- 舊資料或其他情況：允許（向後相容）
    ELSE
      workspace_id IS NULL
      OR workspace_id = get_current_user_workspace()
      OR is_super_admin()
  END
);

-- INSERT policy
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
);

-- UPDATE policy: 只能改自己建立的或超級管理員（非個人事項）
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
USING (
  created_by = auth.uid()
  OR (is_super_admin() AND visibility != 'personal')
  OR workspace_id IS NULL
);

-- DELETE policy: 只能刪自己建立的或超級管理員（非個人事項）
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
USING (
  created_by = auth.uid()
  OR (is_super_admin() AND visibility != 'personal')
  OR workspace_id IS NULL
);

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✅ Calendar Events RLS 已更新';
  RAISE NOTICE '  • 個人事項 (personal): 只有本人能看';
  RAISE NOTICE '  • 公司事項 (company): 同 workspace 或超級管理員';
  RAISE NOTICE '  • 超級管理員可看所有公司的行事曆，但不能看別人的個人事項';
END $$;
