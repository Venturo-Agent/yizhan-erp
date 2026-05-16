-- ============================================
-- 修正地區表格 RLS：NULL 安全版本
-- ============================================
-- 日期: 2026-01-02
-- 問題: 當 get_current_user_workspace() 返回 NULL 時，RLS 比較失敗
-- 修正: 使用 COALESCE 確保比較不會因 NULL 而失敗
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 更新 RLS Policies（NULL 安全版本）
-- ============================================

-- 1.1 Countries
DROP POLICY IF EXISTS "countries_select" ON public.countries;
DROP POLICY IF EXISTS "countries_insert" ON public.countries;
DROP POLICY IF EXISTS "countries_update" ON public.countries;
DROP POLICY IF EXISTS "countries_delete" ON public.countries;

-- SELECT: 只看自己 workspace 的資料，或 Super Admin 看全部
DROP POLICY IF EXISTS "countries_select" ON public.countries;
CREATE POLICY "countries_select" ON public.countries FOR SELECT
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

-- INSERT: 只能建立自己 workspace 的資料
DROP POLICY IF EXISTS "countries_insert" ON public.countries;
CREATE POLICY "countries_insert" ON public.countries FOR INSERT
WITH CHECK (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

-- UPDATE: 只能更新自己 workspace 的資料
DROP POLICY IF EXISTS "countries_update" ON public.countries;
CREATE POLICY "countries_update" ON public.countries FOR UPDATE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

-- DELETE: 只能刪除自己 workspace 的資料
DROP POLICY IF EXISTS "countries_delete" ON public.countries;
CREATE POLICY "countries_delete" ON public.countries FOR DELETE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

-- 1.2 Cities
DROP POLICY IF EXISTS "cities_select" ON public.cities;
DROP POLICY IF EXISTS "cities_insert" ON public.cities;
DROP POLICY IF EXISTS "cities_update" ON public.cities;
DROP POLICY IF EXISTS "cities_delete" ON public.cities;

DROP POLICY IF EXISTS "cities_select" ON public.cities;
CREATE POLICY "cities_select" ON public.cities FOR SELECT
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_insert" ON public.cities;
CREATE POLICY "cities_insert" ON public.cities FOR INSERT
WITH CHECK (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_update" ON public.cities;
CREATE POLICY "cities_update" ON public.cities FOR UPDATE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_delete" ON public.cities;
CREATE POLICY "cities_delete" ON public.cities FOR DELETE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

-- 1.3 Regions
DROP POLICY IF EXISTS "regions_select" ON public.regions;
DROP POLICY IF EXISTS "regions_insert" ON public.regions;
DROP POLICY IF EXISTS "regions_update" ON public.regions;
DROP POLICY IF EXISTS "regions_delete" ON public.regions;

DROP POLICY IF EXISTS "regions_select" ON public.regions;
CREATE POLICY "regions_select" ON public.regions FOR SELECT
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_insert" ON public.regions;
CREATE POLICY "regions_insert" ON public.regions FOR INSERT
WITH CHECK (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_update" ON public.regions;
CREATE POLICY "regions_update" ON public.regions FOR UPDATE
USING (
  (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_delete" ON public.regions;
CREATE POLICY "regions_delete" ON public.regions FOR DELETE
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
  RAISE NOTICE '✅ RLS NULL 安全修正完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '變更:';
  RAISE NOTICE '  • 當 workspace 未設定時，返回空結果而非錯誤';
  RAISE NOTICE '  • Super Admin 可以跨公司查看';
  RAISE NOTICE '  • 新公司會看到空的國家/城市列表（正常）';
  RAISE NOTICE '========================================';
END $$;
