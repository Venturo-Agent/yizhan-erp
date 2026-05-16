-- Round 13：hotels / restaurants / tour_destinations 對齊 attractions 模式
-- William 拍板：「移動到漫途」—— 這 3 字典表現有資料全歸漫途 platform workspace
--
-- 為什麼：
--   - attractions 已是「漫途共用 + 各租戶私版 + 付費 license」標準範例
--   - 其他 3 字典表落後沒做、現在 RLS USING true 等於穿幫
--
-- 改動：
--   1. ADD COLUMN workspace_id NOT NULL DEFAULT venturo_platform_id
--      - existing row 自動歸漫途（PG 11+ ADD COLUMN with DEFAULT 是 atomic、O(1)）
--      - 新 INSERT 預設歸漫途、client 想自建私版時要明確帶 workspace_id = own
--   2. 改 RLS:
--      - SELECT: own OR venturo OR super_admin（無 license gate、未來加）
--      - INSERT/UPDATE/DELETE: own OR super_admin（限自己 workspace）
--   3. 付費 license gate 暫不加、未來商業化上線時再加
--
-- 影響：
--   - 現有 client useHotels / useRestaurants / useTourDestinations 透過 RLS 自動拿到漫途版（workspace_id = venturo）
--   - 各租戶客戶之後可在自己 workspace 加私版 hotels（INSERT with workspace_id = own）
--   - 商業上預留 has_capability_for_workspace gate

BEGIN;

-- ============================================================================
-- 1. hotels：歸漫途、加 workspace_id、改 RLS
-- ============================================================================
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL
  DEFAULT 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid;

CREATE INDEX IF NOT EXISTS hotels_workspace_id_idx ON public.hotels (workspace_id);

DROP POLICY IF EXISTS "hotels_select" ON public.hotels;
DROP POLICY IF EXISTS "hotels_insert" ON public.hotels;
DROP POLICY IF EXISTS "hotels_update" ON public.hotels;
DROP POLICY IF EXISTS "hotels_delete" ON public.hotels;

CREATE POLICY "hotels_select" ON public.hotels
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid
    OR is_super_admin()
  );

CREATE POLICY "hotels_insert" ON public.hotels
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "hotels_update" ON public.hotels
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  )
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "hotels_delete" ON public.hotels
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 2. restaurants：同 hotels
-- ============================================================================
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL
  DEFAULT 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid;

CREATE INDEX IF NOT EXISTS restaurants_workspace_id_idx ON public.restaurants (workspace_id);

DROP POLICY IF EXISTS "restaurants_select" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_insert" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_update" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_delete" ON public.restaurants;

CREATE POLICY "restaurants_select" ON public.restaurants
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid
    OR is_super_admin()
  );

CREATE POLICY "restaurants_insert" ON public.restaurants
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "restaurants_update" ON public.restaurants
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  )
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "restaurants_delete" ON public.restaurants
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ============================================================================
-- 3. tour_destinations：同
-- ============================================================================
ALTER TABLE public.tour_destinations
  ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL
  DEFAULT 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid;

CREATE INDEX IF NOT EXISTS tour_destinations_workspace_id_idx ON public.tour_destinations (workspace_id);

DROP POLICY IF EXISTS "tour_destinations_select" ON public.tour_destinations;
DROP POLICY IF EXISTS "tour_destinations_insert" ON public.tour_destinations;
DROP POLICY IF EXISTS "tour_destinations_update" ON public.tour_destinations;
DROP POLICY IF EXISTS "tour_destinations_delete" ON public.tour_destinations;

CREATE POLICY "tour_destinations_select" ON public.tour_destinations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid
    OR is_super_admin()
  );

CREATE POLICY "tour_destinations_insert" ON public.tour_destinations
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "tour_destinations_update" ON public.tour_destinations
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  )
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "tour_destinations_delete" ON public.tour_destinations
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

COMMIT;

-- 驗證 SQL（手動跑、不在 transaction 內）
-- SELECT count(*) FROM hotels WHERE workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid; -- 預期 480
-- SELECT count(*) FROM restaurants WHERE workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid; -- 預期 301
-- SELECT count(*) FROM tour_destinations WHERE workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid; -- 預期 47
