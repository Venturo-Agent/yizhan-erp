-- ============================================
-- 修正地區表格 RLS：移除 NULL 全域共用
-- ============================================
-- 日期: 2026-01-02
-- 問題: 之前的 RLS 允許 workspace_id IS NULL 對所有人可見
-- 修正: 新公司不應該看到其他公司的資料
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 確保現有資料都有 workspace_id
-- ============================================

DO $$
DECLARE
  tp_workspace_id uuid;
  updated_count integer;
BEGIN
  -- 找到 TP workspace
  SELECT id INTO tp_workspace_id
  FROM public.workspaces
  WHERE code = 'TP';

  IF tp_workspace_id IS NOT NULL THEN
    -- 更新所有 NULL workspace_id 的資料到 TP
    UPDATE public.countries
    SET workspace_id = tp_workspace_id
    WHERE workspace_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ countries 更新: % 筆', updated_count;

    UPDATE public.cities
    SET workspace_id = tp_workspace_id
    WHERE workspace_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ cities 更新: % 筆', updated_count;

    UPDATE public.regions
    SET workspace_id = tp_workspace_id
    WHERE workspace_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ regions 更新: % 筆', updated_count;
  ELSE
    RAISE NOTICE '⚠️ 找不到 TP workspace';
  END IF;
END $$;

-- ============================================
-- Part 2: 更新 RLS Policies（移除 NULL 全域共用）
-- ============================================

-- 2.1 Countries
DROP POLICY IF EXISTS "countries_select" ON public.countries;
DROP POLICY IF EXISTS "countries_insert" ON public.countries;
DROP POLICY IF EXISTS "countries_update" ON public.countries;
DROP POLICY IF EXISTS "countries_delete" ON public.countries;

DROP POLICY IF EXISTS "countries_select" ON public.countries;
CREATE POLICY "countries_select" ON public.countries FOR SELECT
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "countries_insert" ON public.countries;
CREATE POLICY "countries_insert" ON public.countries FOR INSERT
WITH CHECK (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "countries_update" ON public.countries;
CREATE POLICY "countries_update" ON public.countries FOR UPDATE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "countries_delete" ON public.countries;
CREATE POLICY "countries_delete" ON public.countries FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 2.2 Cities
DROP POLICY IF EXISTS "cities_select" ON public.cities;
DROP POLICY IF EXISTS "cities_insert" ON public.cities;
DROP POLICY IF EXISTS "cities_update" ON public.cities;
DROP POLICY IF EXISTS "cities_delete" ON public.cities;

DROP POLICY IF EXISTS "cities_select" ON public.cities;
CREATE POLICY "cities_select" ON public.cities FOR SELECT
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_insert" ON public.cities;
CREATE POLICY "cities_insert" ON public.cities FOR INSERT
WITH CHECK (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_update" ON public.cities;
CREATE POLICY "cities_update" ON public.cities FOR UPDATE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_delete" ON public.cities;
CREATE POLICY "cities_delete" ON public.cities FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 2.3 Regions
DROP POLICY IF EXISTS "regions_select" ON public.regions;
DROP POLICY IF EXISTS "regions_insert" ON public.regions;
DROP POLICY IF EXISTS "regions_update" ON public.regions;
DROP POLICY IF EXISTS "regions_delete" ON public.regions;

DROP POLICY IF EXISTS "regions_select" ON public.regions;
CREATE POLICY "regions_select" ON public.regions FOR SELECT
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_insert" ON public.regions;
CREATE POLICY "regions_insert" ON public.regions FOR INSERT
WITH CHECK (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_update" ON public.regions;
CREATE POLICY "regions_update" ON public.regions FOR UPDATE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_delete" ON public.regions;
CREATE POLICY "regions_delete" ON public.regions FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 2.4 Ref_airports（保持原樣：IATA 標準資料全域共用）
-- 機場代碼是標準資料，應該所有公司都能看到
-- 不需要修改

COMMIT;

-- ============================================
-- 驗證
-- ============================================
DO $$
DECLARE
  null_countries integer;
  null_cities integer;
  null_regions integer;
BEGIN
  SELECT COUNT(*) INTO null_countries FROM public.countries WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO null_cities FROM public.cities WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO null_regions FROM public.regions WHERE workspace_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS 修正完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '無 workspace_id 的資料（應為 0）:';
  RAISE NOTICE '  • countries: % 筆', null_countries;
  RAISE NOTICE '  • cities: % 筆', null_cities;
  RAISE NOTICE '  • regions: % 筆', null_regions;
  RAISE NOTICE '';
  RAISE NOTICE '效果:';
  RAISE NOTICE '  • 新公司看不到 TP/TC 的地區資料';
  RAISE NOTICE '  • 每個公司只能看到自己的資料';
  RAISE NOTICE '  • Super Admin 可跨公司查看';
  RAISE NOTICE '  • 機場資料維持全域共用';
  RAISE NOTICE '========================================';
END $$;
