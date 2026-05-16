-- ============================================================================
-- attractions / michelin_restaurants / premium_experiences
-- 改為按租戶隔離 + 授權機制（未來可賣景點資料）
-- ============================================================================
-- 背景：之前 workspace_id = NULL 視為「全站共享」，導致新租戶免費看到所有 seed
-- 現在：全部 NULL 資料收回給 CORNER 擁有，其他租戶要透過 attraction_licenses 授權才看得到

BEGIN;

-- 1. 把所有 NULL workspace_id 的景點歸給 CORNER
UPDATE public.attractions
SET workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
WHERE workspace_id IS NULL;

ALTER TABLE public.attractions
ALTER COLUMN workspace_id SET NOT NULL;

-- 2. michelin_restaurants 同樣處理
ALTER TABLE public.michelin_restaurants
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.michelin_restaurants
SET workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
WHERE workspace_id IS NULL;

ALTER TABLE public.michelin_restaurants
ALTER COLUMN workspace_id SET NOT NULL;

-- 3. premium_experiences 同樣處理
ALTER TABLE public.premium_experiences
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.premium_experiences
SET workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
WHERE workspace_id IS NULL;

ALTER TABLE public.premium_experiences
ALTER COLUMN workspace_id SET NOT NULL;

-- 4. 授權表：記錄某個 workspace 被授權看另一個 workspace 的景點資料
--    未來賣景點資料包時 insert 一筆就能看到
CREATE TABLE IF NOT EXISTS public.attraction_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- 授權涵蓋哪些資料表
  covers_attractions boolean NOT NULL DEFAULT true,
  covers_michelin boolean NOT NULL DEFAULT false,
  covers_premium boolean NOT NULL DEFAULT false,
  -- 授權期限（NULL = 永久）
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.employees(id),
  UNIQUE (licensee_workspace_id, source_workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_attraction_licenses_licensee
  ON public.attraction_licenses (licensee_workspace_id);

ALTER TABLE public.attraction_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attraction_licenses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attraction_licenses_select" ON public.attraction_licenses;
CREATE POLICY "attraction_licenses_select" ON public.attraction_licenses
  FOR SELECT TO authenticated
  USING (
    licensee_workspace_id = get_current_user_workspace()
    OR source_workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "attraction_licenses_admin" ON public.attraction_licenses;
CREATE POLICY "attraction_licenses_admin" ON public.attraction_licenses
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 5. Helper function: 檢查當前用戶是否有看某 workspace 景點資料的授權
CREATE OR REPLACE FUNCTION public.has_attraction_license(
  p_source_workspace uuid,
  p_kind text DEFAULT 'attractions'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.attraction_licenses
    WHERE licensee_workspace_id = get_current_user_workspace()
      AND source_workspace_id = p_source_workspace
      AND (expires_at IS NULL OR expires_at > now())
      AND CASE p_kind
        WHEN 'attractions' THEN covers_attractions
        WHEN 'michelin' THEN covers_michelin
        WHEN 'premium' THEN covers_premium
        ELSE false
      END
  );
$$;

-- 6. 更新 attractions RLS：拿掉 NULL 共享，改為自己的 OR 有授權 OR super admin
DROP POLICY IF EXISTS "attractions_select" ON public.attractions;
CREATE POLICY "attractions_select" ON public.attractions
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR has_attraction_license(workspace_id, 'attractions')
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "attractions_insert" ON public.attractions;
CREATE POLICY "attractions_insert" ON public.attractions
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "attractions_update" ON public.attractions;
CREATE POLICY "attractions_update" ON public.attractions
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "attractions_delete" ON public.attractions;
CREATE POLICY "attractions_delete" ON public.attractions
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- 7. michelin_restaurants RLS
ALTER TABLE public.michelin_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.michelin_restaurants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "michelin_select" ON public.michelin_restaurants;
CREATE POLICY "michelin_select" ON public.michelin_restaurants
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR has_attraction_license(workspace_id, 'michelin')
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "michelin_write" ON public.michelin_restaurants;
CREATE POLICY "michelin_write" ON public.michelin_restaurants
  FOR ALL TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 8. premium_experiences RLS
ALTER TABLE public.premium_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_experiences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "premium_select" ON public.premium_experiences;
CREATE POLICY "premium_select" ON public.premium_experiences
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR has_attraction_license(workspace_id, 'premium')
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "premium_write" ON public.premium_experiences;
CREATE POLICY "premium_write" ON public.premium_experiences
  FOR ALL TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());

COMMIT;
