-- ─────────────────────────────────────────────────────────────────────────────
-- 公共資源管理（Shared Data）— Schema 架構
--
-- 設計來源：[[Logan-Workspace/audit/2026-05-11-公共資源管理-規格.md]]
--
-- 範圍：6 樣資源（銀行 / 國家 / 機場 / 景點 / 飯店 / 餐廳）統一漫途管理
--   分兩類：
--     - codes（銀行 / 國家 / 機場）：漫途維護、其他 workspace 唯讀
--     - content（景點 / 飯店 / 餐廳）：漫途維護、本期客戶 workspace UI 不顯示
--
-- 設計原則（William 拍板、對齊鐵律 §0「沒有特權」）：
--   完全走 workspace_features + role_capabilities + RLS 三層、不依賴 is_admin
--   - workspace_features：哪個 workspace 開了能力（漫途明確 seed、其他預設沒）
--   - role_capabilities：哪個 role 有具體權限（漫途 admin role 明確 seed、其他 workspace
--     未來申請開通時、由那 workspace 自己 admin 決定給哪些 role）
--   - 未來客戶想開 → 漫途幫他開 feature → 那 workspace 自己 admin 自己分配 capability
--
-- 本 migration 做的事：
--   1. workspace_features 加 shared_data_codes / shared_data_content（只漫途開）
--   2. role_capabilities 加 12 條 capability、只給漫途 admin role
--   3. 6 張表加 audit 欄位（created_by_workspace_id / created_by_user_id）
--   4. attractions / hotels / restaurants 砍 workspace_id 欄位 + 對應 index
--      （ref_airports cctk B2 已砍 trigger_auto_set_workspace_id）
--   5. RLS：SELECT 全 authenticated 通、INSERT/UPDATE/DELETE 看 capability
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══ 1. workspace_features：漫途開兩個 feature ═══
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
VALUES
  ('b2222222-2222-2222-2222-222222222222', 'shared_data_codes', true),
  ('b2222222-2222-2222-2222-222222222222', 'shared_data_content', true)
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- ═══ 2. role_capabilities：12 條 capability 只給漫途 admin role ═══
-- role id = 7829922c-dcdf-4d31-871a-d8780b8cfc52（漫途「系統主管」、跟 cctk fix_smoke_findings 同 pattern）
-- 其他 workspace 未來申請開通時、由那 workspace 自己 admin 自己分配 capability
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT '7829922c-dcdf-4d31-871a-d8780b8cfc52'::uuid, code, true
FROM (VALUES
  ('shared_data.banks.read'), ('shared_data.banks.write'),
  ('shared_data.countries.read'), ('shared_data.countries.write'),
  ('shared_data.airports.read'), ('shared_data.airports.write'),
  ('shared_data.attractions.read'), ('shared_data.attractions.write'),
  ('shared_data.hotels.read'), ('shared_data.hotels.write'),
  ('shared_data.restaurants.read'), ('shared_data.restaurants.write')
) AS caps(code)
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

-- ═══ 3. 6 張表加 audit 欄位 ═══
ALTER TABLE public.ref_banks
  ADD COLUMN IF NOT EXISTS created_by_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.ref_countries
  ADD COLUMN IF NOT EXISTS created_by_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.ref_airports
  ADD COLUMN IF NOT EXISTS created_by_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS created_by_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS created_by_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS created_by_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

-- ═══ 4. 砍既有 policies（必先砍、不然下面 DROP COLUMN workspace_id 會被擋）═══
DO $$
DECLARE
  tbl text;
  pol text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['ref_banks','ref_countries','ref_airports','attractions','hotels','restaurants'])
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ═══ 5. 6 張表全部砍 workspace_id（改全平台共用）═══
-- cctk B2 commit a4baa57 已砍 ref_airports 的 trigger_auto_set_workspace_id、本次延續
DROP TRIGGER IF EXISTS trigger_auto_set_workspace_id ON public.attractions;
DROP TRIGGER IF EXISTS trigger_auto_set_workspace_id ON public.hotels;
DROP TRIGGER IF EXISTS trigger_auto_set_workspace_id ON public.restaurants;

DROP INDEX IF EXISTS idx_attractions_workspace;
DROP INDEX IF EXISTS idx_hotels_workspace;
DROP INDEX IF EXISTS idx_restaurants_workspace;

-- 內容類 3 張砍欄位
ALTER TABLE public.attractions DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.hotels      DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.restaurants DROP COLUMN IF EXISTS workspace_id;
-- 代號類 3 張同步砍（ref_airports 可能 cctk B2 已砍、ref_banks 本來無、ref_countries 本次砍）
ALTER TABLE public.ref_airports  DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.ref_countries DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.ref_banks     DROP COLUMN IF EXISTS workspace_id;

-- ═══ 6. RLS：SELECT 全 authenticated 通、INSERT/UPDATE/DELETE 看 capability ═══

-- 啟用 RLS（如果還沒啟）
ALTER TABLE public.ref_banks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_countries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_airports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attractions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants    ENABLE ROW LEVEL SECURITY;

-- ref_banks
CREATE POLICY ref_banks_select ON public.ref_banks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_banks_write ON public.ref_banks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.banks.write'
        AND rc.enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.banks.write'
        AND rc.enabled = true
    )
  );

-- ref_countries
CREATE POLICY ref_countries_select ON public.ref_countries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_countries_write ON public.ref_countries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.countries.write'
        AND rc.enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.countries.write'
        AND rc.enabled = true
    )
  );

-- ref_airports
CREATE POLICY ref_airports_select ON public.ref_airports
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_airports_write ON public.ref_airports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.airports.write'
        AND rc.enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.airports.write'
        AND rc.enabled = true
    )
  );

-- attractions
CREATE POLICY attractions_select ON public.attractions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY attractions_write ON public.attractions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.attractions.write'
        AND rc.enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.attractions.write'
        AND rc.enabled = true
    )
  );

-- hotels
CREATE POLICY hotels_select ON public.hotels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY hotels_write ON public.hotels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.hotels.write'
        AND rc.enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.hotels.write'
        AND rc.enabled = true
    )
  );

-- restaurants
CREATE POLICY restaurants_select ON public.restaurants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY restaurants_write ON public.restaurants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.restaurants.write'
        AND rc.enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.user_id = auth.uid()
        AND rc.capability_code = 'shared_data.restaurants.write'
        AND rc.enabled = true
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
