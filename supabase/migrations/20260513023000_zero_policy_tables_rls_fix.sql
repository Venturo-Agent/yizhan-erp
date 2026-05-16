-- ─────────────────────────────────────────────────────────────────────────────
-- 修復 5 個「RLS ENABLED + 0 policy」表（B5 production snapshot 發現）
--
-- 表清單（apply 時發現 expense_categories 已有 1 條 ALL policy、不用補、剩 4 表）：
--   1. brands — 三維品牌（workspace_id 直接欄位）
--   2. employee_branches — 員工×分公司 join（無 workspace_id、透過 employee 對應）
--   3. employee_brands — 員工×品牌 join
--   4. employee_departments — 員工×部門 join
--
-- 對應 frontend writer：上述都已有 user-session client 寫入路徑、目前 RLS 0 policy = 全擋
-- = 客戶用到時會炸（但 demo 資料是 admin 預先 seed、所以還沒爆）
--
-- 修法：standard workspace_id 隔離（同 customers / suppliers / contracts pattern）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. brands（workspace_id 直接欄位）
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY brands_select ON public.brands FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());
CREATE POLICY brands_insert ON public.brands FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());
CREATE POLICY brands_update ON public.brands FOR UPDATE TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());
CREATE POLICY brands_delete ON public.brands FOR DELETE TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- ═══════════════════════════════════════════════════════════════
-- 2. employee_branches（透過 employee 對應 workspace）
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY employee_branches_select ON public.employee_branches FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_branches.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_branches_insert ON public.employee_branches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_branches.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_branches_update ON public.employee_branches FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_branches.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_branches_delete ON public.employee_branches FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_branches.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. employee_brands
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY employee_brands_select ON public.employee_brands FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_brands.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_brands_insert ON public.employee_brands FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_brands.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_brands_update ON public.employee_brands FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_brands.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_brands_delete ON public.employee_brands FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_brands.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. employee_departments
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY employee_departments_select ON public.employee_departments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_departments.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_departments_insert ON public.employee_departments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_departments.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_departments_update ON public.employee_departments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_departments.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );
CREATE POLICY employee_departments_delete ON public.employee_departments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_departments.employee_id
            AND e.workspace_id = public.get_current_user_workspace())
  );

-- 驗證
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT 'brands' AS tbl UNION ALL SELECT 'employee_branches' UNION ALL SELECT 'employee_brands' UNION ALL SELECT 'employee_departments'
  LOOP
    IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl) <> 4 THEN
      RAISE EXCEPTION '驗證失敗：% 不是 4 條 policy', r.tbl;
    END IF;
  END LOOP;
  RAISE NOTICE '✓ 4 表都補上 4 條 policy';
END $$;

COMMIT;
