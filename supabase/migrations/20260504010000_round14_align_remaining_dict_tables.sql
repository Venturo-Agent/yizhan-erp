-- Round 14：剩餘字典表加 workspace_id + 改 RLS
-- William 拍板：
--   - ref_countries / ref_airports：跟 hotels/restaurants 一樣 → 漫途共用 + 各租戶私版
--   - supplier_categories：一次性預設（每 tenant 一份、existing 歸 CORNER）
--   - vendor_costs / tasks / tour_leaders：私有（existing 歸 CORNER）
--   - cost_templates：0 row、預備 schema（新建必帶 workspace_id）
--
-- VENTURO platform: aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a
-- CORNER (founding user): 8ef05a74-1f87-48ab-afd3-9bfeb423935d

BEGIN;

-- ============================================================================
-- 1. ref_countries：漫途共用（跟 hotels 一致）
-- ============================================================================
ALTER TABLE public.ref_countries ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid;
CREATE INDEX IF NOT EXISTS ref_countries_workspace_id_idx ON public.ref_countries (workspace_id);

DROP POLICY IF EXISTS "ref_countries_admin_delete" ON public.ref_countries;
DROP POLICY IF EXISTS "ref_countries_admin_insert" ON public.ref_countries;
DROP POLICY IF EXISTS "ref_countries_admin_update" ON public.ref_countries;
DROP POLICY IF EXISTS "ref_countries_public_read" ON public.ref_countries;

CREATE POLICY "ref_countries_select" ON public.ref_countries AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid OR is_super_admin());
CREATE POLICY "ref_countries_insert" ON public.ref_countries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "ref_countries_update" ON public.ref_countries AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "ref_countries_delete" ON public.ref_countries AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================================================
-- 2. ref_airports：漫途共用
-- ============================================================================
ALTER TABLE public.ref_airports ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid;
CREATE INDEX IF NOT EXISTS ref_airports_workspace_id_idx ON public.ref_airports (workspace_id);

DROP POLICY IF EXISTS "ref_airports_admin_delete" ON public.ref_airports;
DROP POLICY IF EXISTS "ref_airports_admin_insert" ON public.ref_airports;
DROP POLICY IF EXISTS "ref_airports_admin_update" ON public.ref_airports;
DROP POLICY IF EXISTS "ref_airports_public_read" ON public.ref_airports;

CREATE POLICY "ref_airports_select" ON public.ref_airports AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR workspace_id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid OR is_super_admin());
CREATE POLICY "ref_airports_insert" ON public.ref_airports AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "ref_airports_update" ON public.ref_airports AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "ref_airports_delete" ON public.ref_airports AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================================================
-- 3. supplier_categories：一次性預設（existing 歸 CORNER、之後各 tenant trigger seed 一份）
-- ============================================================================
ALTER TABLE public.supplier_categories ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT '8ef05a74-1f87-48ab-afd3-9bfeb423935d'::uuid;
CREATE INDEX IF NOT EXISTS supplier_categories_workspace_id_idx ON public.supplier_categories (workspace_id);

DROP POLICY IF EXISTS "supplier_categories_select" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_insert" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_update" ON public.supplier_categories;
DROP POLICY IF EXISTS "supplier_categories_delete" ON public.supplier_categories;

CREATE POLICY "supplier_categories_select" ON public.supplier_categories AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "supplier_categories_insert" ON public.supplier_categories AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "supplier_categories_update" ON public.supplier_categories AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "supplier_categories_delete" ON public.supplier_categories AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================================================
-- 4. vendor_costs：私有（existing 歸 CORNER）
-- ============================================================================
ALTER TABLE public.vendor_costs ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT '8ef05a74-1f87-48ab-afd3-9bfeb423935d'::uuid;
CREATE INDEX IF NOT EXISTS vendor_costs_workspace_id_idx ON public.vendor_costs (workspace_id);

DROP POLICY IF EXISTS "vendor_costs_select" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_insert" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_update" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_delete" ON public.vendor_costs;

CREATE POLICY "vendor_costs_select" ON public.vendor_costs AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "vendor_costs_insert" ON public.vendor_costs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "vendor_costs_update" ON public.vendor_costs AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "vendor_costs_delete" ON public.vendor_costs AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================================================
-- 5. tasks：私有（員工待辦、existing 歸 CORNER）
-- ============================================================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT '8ef05a74-1f87-48ab-afd3-9bfeb423935d'::uuid;
CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON public.tasks (workspace_id);

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "tasks_insert" ON public.tasks AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "tasks_update" ON public.tasks AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "tasks_delete" ON public.tasks AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================================================
-- 6. tour_leaders：私有（外部合作領隊、existing 歸 CORNER）
-- ============================================================================
ALTER TABLE public.tour_leaders ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT '8ef05a74-1f87-48ab-afd3-9bfeb423935d'::uuid;
CREATE INDEX IF NOT EXISTS tour_leaders_workspace_id_idx ON public.tour_leaders (workspace_id);

DROP POLICY IF EXISTS "tour_leaders_select" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_insert" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_update" ON public.tour_leaders;
DROP POLICY IF EXISTS "tour_leaders_delete" ON public.tour_leaders;

CREATE POLICY "tour_leaders_select" ON public.tour_leaders AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "tour_leaders_insert" ON public.tour_leaders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "tour_leaders_update" ON public.tour_leaders AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "tour_leaders_delete" ON public.tour_leaders AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================================================
-- 7. cost_templates：0 row、預備 schema（新建必帶 workspace_id、無 default）
-- ============================================================================
-- 注意：因為 0 row、不需要 DEFAULT、但 NOT NULL 強制 caller 帶值
ALTER TABLE public.cost_templates ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.cost_templates SET workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'::uuid WHERE workspace_id IS NULL;
ALTER TABLE public.cost_templates ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS cost_templates_workspace_id_idx ON public.cost_templates (workspace_id);

DROP POLICY IF EXISTS "cost_templates_select" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_insert" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_update" ON public.cost_templates;
DROP POLICY IF EXISTS "cost_templates_delete" ON public.cost_templates;

CREATE POLICY "cost_templates_select" ON public.cost_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "cost_templates_insert" ON public.cost_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "cost_templates_update" ON public.cost_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin())
  WITH CHECK (workspace_id = get_current_user_workspace() OR is_super_admin());
CREATE POLICY "cost_templates_delete" ON public.cost_templates AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

COMMIT;
