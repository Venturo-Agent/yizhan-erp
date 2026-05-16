-- ============================================
-- 修正 tours 表 RLS：使用正確的函數名稱
-- ============================================
-- 日期: 2026-01-02
-- 問題: tours RLS 使用 get_user_workspace_id() 但該函數可能不存在
-- 修正: 改用 get_current_user_workspace()
-- ============================================

BEGIN;

-- 1. 先建立 get_user_workspace_id 作為 get_current_user_workspace 的別名（向後兼容）
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_current_user_workspace();
$$;

COMMENT ON FUNCTION public.get_user_workspace_id() IS '向後兼容：呼叫 get_current_user_workspace()';

-- 2. 重新建立 tours 的 RLS policies（使用 NULL 安全版本）
DROP POLICY IF EXISTS "tours_select" ON public.tours;
DROP POLICY IF EXISTS "tours_insert" ON public.tours;
DROP POLICY IF EXISTS "tours_update" ON public.tours;
DROP POLICY IF EXISTS "tours_delete" ON public.tours;

DROP POLICY IF EXISTS "tours_select" ON public.tours;
CREATE POLICY "tours_select" ON public.tours FOR SELECT
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "tours_insert" ON public.tours;
CREATE POLICY "tours_insert" ON public.tours FOR INSERT
WITH CHECK (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "tours_update" ON public.tours;
CREATE POLICY "tours_update" ON public.tours FOR UPDATE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "tours_delete" ON public.tours;
CREATE POLICY "tours_delete" ON public.tours FOR DELETE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

COMMIT;

-- ============================================
-- 驗證
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Tours RLS 修正完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '變更:';
  RAISE NOTICE '  • 建立 get_user_workspace_id() 別名函數';
  RAISE NOTICE '  • 更新 tours RLS 為 NULL 安全版本';
  RAISE NOTICE '  • JY 用戶現在會看到空的旅遊團列表（正常）';
  RAISE NOTICE '========================================';
END $$;
