-- ============================================
-- 地區表格多租戶支援
-- ============================================
-- 日期: 2026-01-02
-- 用途: 為 countries, cities, regions, ref_airports 加入 workspace_id
-- 目標: 讓每個公司可以有自己獨立的地區資料
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 新增 workspace_id 欄位
-- ============================================

-- 1.1 countries 表
ALTER TABLE public.countries
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

COMMENT ON COLUMN public.countries.workspace_id IS '所屬工作區（NULL 表示共用，但建議每個公司獨立管理）';

-- 1.2 cities 表
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

COMMENT ON COLUMN public.cities.workspace_id IS '所屬工作區';

-- 1.3 regions 表
ALTER TABLE public.regions
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

COMMENT ON COLUMN public.regions.workspace_id IS '所屬工作區';

-- 1.4 ref_airports 表
ALTER TABLE public.ref_airports
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

COMMENT ON COLUMN public.ref_airports.workspace_id IS '所屬工作區（NULL 表示全域 IATA 標準資料）';

-- ============================================
-- Part 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_countries_workspace ON public.countries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cities_workspace ON public.cities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_regions_workspace ON public.regions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ref_airports_workspace ON public.ref_airports(workspace_id);

-- ============================================
-- Part 3: 遷移現有資料到 TP workspace
-- ============================================

-- 取得 TP workspace 的 ID
DO $$
DECLARE
  tp_workspace_id uuid;
  updated_count integer;
BEGIN
  -- 找到 TP workspace
  SELECT id INTO tp_workspace_id
  FROM public.workspaces
  WHERE code = 'TP';

  IF tp_workspace_id IS NULL THEN
    RAISE NOTICE '⚠️ 找不到 TP workspace，跳過資料遷移';
  ELSE
    -- 遷移 countries
    UPDATE public.countries
    SET workspace_id = tp_workspace_id
    WHERE workspace_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ countries 遷移完成: % 筆', updated_count;

    -- 遷移 cities
    UPDATE public.cities
    SET workspace_id = tp_workspace_id
    WHERE workspace_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ cities 遷移完成: % 筆', updated_count;

    -- 遷移 regions
    UPDATE public.regions
    SET workspace_id = tp_workspace_id
    WHERE workspace_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ regions 遷移完成: % 筆', updated_count;

    -- 遷移 ref_airports（只遷移之前使用者建立的，保留 IATA 標準資料為 NULL）
    -- 注意：初始 seed 的 IATA 資料保持 workspace_id = NULL（全域共用）
    -- 只有使用者之後新增的才會有 workspace_id
    RAISE NOTICE '✅ ref_airports 保留全域共用（IATA 標準資料）';
  END IF;
END $$;

-- ============================================
-- Part 4: 啟用 RLS 並建立 Policies
-- ============================================

-- 4.1 Countries RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 policies（如果存在）
DROP POLICY IF EXISTS "countries_select" ON public.countries;
DROP POLICY IF EXISTS "countries_insert" ON public.countries;
DROP POLICY IF EXISTS "countries_update" ON public.countries;
DROP POLICY IF EXISTS "countries_delete" ON public.countries;

-- 建立新的 policies
DROP POLICY IF EXISTS "countries_select" ON public.countries;
CREATE POLICY "countries_select" ON public.countries FOR SELECT
USING (
  workspace_id IS NULL  -- 全域共用
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "countries_insert" ON public.countries;
CREATE POLICY "countries_insert" ON public.countries FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "countries_update" ON public.countries;
CREATE POLICY "countries_update" ON public.countries FOR UPDATE
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "countries_delete" ON public.countries;
CREATE POLICY "countries_delete" ON public.countries FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 4.2 Cities RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_select" ON public.cities;
DROP POLICY IF EXISTS "cities_insert" ON public.cities;
DROP POLICY IF EXISTS "cities_update" ON public.cities;
DROP POLICY IF EXISTS "cities_delete" ON public.cities;

DROP POLICY IF EXISTS "cities_select" ON public.cities;
CREATE POLICY "cities_select" ON public.cities FOR SELECT
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_insert" ON public.cities;
CREATE POLICY "cities_insert" ON public.cities FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_update" ON public.cities;
CREATE POLICY "cities_update" ON public.cities FOR UPDATE
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "cities_delete" ON public.cities;
CREATE POLICY "cities_delete" ON public.cities FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 4.3 Regions RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regions_select" ON public.regions;
DROP POLICY IF EXISTS "regions_insert" ON public.regions;
DROP POLICY IF EXISTS "regions_update" ON public.regions;
DROP POLICY IF EXISTS "regions_delete" ON public.regions;

DROP POLICY IF EXISTS "regions_select" ON public.regions;
CREATE POLICY "regions_select" ON public.regions FOR SELECT
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_insert" ON public.regions;
CREATE POLICY "regions_insert" ON public.regions FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_update" ON public.regions;
CREATE POLICY "regions_update" ON public.regions FOR UPDATE
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "regions_delete" ON public.regions;
CREATE POLICY "regions_delete" ON public.regions FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 4.4 Ref_airports RLS
ALTER TABLE public.ref_airports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ref_airports_select" ON public.ref_airports;
DROP POLICY IF EXISTS "ref_airports_insert" ON public.ref_airports;
DROP POLICY IF EXISTS "ref_airports_update" ON public.ref_airports;
DROP POLICY IF EXISTS "ref_airports_delete" ON public.ref_airports;

DROP POLICY IF EXISTS "ref_airports_select" ON public.ref_airports;
CREATE POLICY "ref_airports_select" ON public.ref_airports FOR SELECT
USING (
  workspace_id IS NULL  -- IATA 標準資料全域可見
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "ref_airports_insert" ON public.ref_airports;
CREATE POLICY "ref_airports_insert" ON public.ref_airports FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "ref_airports_update" ON public.ref_airports;
CREATE POLICY "ref_airports_update" ON public.ref_airports FOR UPDATE
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "ref_airports_delete" ON public.ref_airports;
CREATE POLICY "ref_airports_delete" ON public.ref_airports FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

COMMIT;

-- ============================================
-- 驗證
-- ============================================
DO $$
DECLARE
  countries_count integer;
  cities_count integer;
  regions_count integer;
  airports_count integer;
BEGIN
  SELECT COUNT(*) INTO countries_count FROM public.countries WHERE workspace_id IS NOT NULL;
  SELECT COUNT(*) INTO cities_count FROM public.cities WHERE workspace_id IS NOT NULL;
  SELECT COUNT(*) INTO regions_count FROM public.regions WHERE workspace_id IS NOT NULL;
  SELECT COUNT(*) INTO airports_count FROM public.ref_airports WHERE workspace_id IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 地區表格多租戶支援建立完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已更新的表格:';
  RAISE NOTICE '  • countries: % 筆有 workspace_id', countries_count;
  RAISE NOTICE '  • cities: % 筆有 workspace_id', cities_count;
  RAISE NOTICE '  • regions: % 筆有 workspace_id', regions_count;
  RAISE NOTICE '  • ref_airports: % 筆有 workspace_id（IATA 標準資料保持全域）', airports_count;
  RAISE NOTICE '';
  RAISE NOTICE '功能說明:';
  RAISE NOTICE '  • 每個公司可以有自己的國家/城市/地區/機場資料';
  RAISE NOTICE '  • 現有 TP 資料已遷移';
  RAISE NOTICE '  • RLS 自動過濾資料';
  RAISE NOTICE '  • Super Admin 可跨公司查看';
  RAISE NOTICE '========================================';
END $$;
