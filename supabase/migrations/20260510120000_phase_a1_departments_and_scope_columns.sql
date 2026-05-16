-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A1: 員工 scope 欄位接通既有 branches / departments
--
-- 重要發現（2026-05-10 deploy 階段才發現）：
--   venturo-aierp DB 已經有 branches / departments 表（空殼、建好沒接通員工）。
--   既有 schema 比我原設計的更完整：
--     branches: id, workspace_id, name, code, address, phone,
--               display_order, is_active, is_default, parent_branch_id
--     departments: id, workspace_id, name, code, display_order,
--                  is_active, is_default, parent_department_id
--
--   ✓ 不重建表、用既有
--   ✓ employees 加 branch_id / department_id / is_dept_manager 三欄位、
--     FK 指既有 branches / departments
--   ✓ 樹狀結構（parent_*）暫不用、scope_visible 先對齊 leaf
--
-- 業務語境：
--   - 兩層 scope：分公司（地理） + 部門（功能）
--   - 跨分公司預設互看不到（cross_branch.read cap 例外）
--   - 部門主管看 / 改部門員工的 row（is_dept_manager flag）
--   - 退化：客戶沒用分公司 → branch_id 全 NULL、規則退化
--
-- 紅線檢核：
--   - 不動既有 RLS（A3 才動）
--   - 不動 workspaces（紅線 A）
--   - FK 用 ON DELETE SET NULL（紅線 B 風格、員工 row 不會因部門刪除而消失）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. employees 加 scope 欄位
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS branch_id UUID
    REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department_id UUID
    REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_dept_manager BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_employees_branch
  ON public.employees (branch_id)
  WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_department
  ON public.employees (department_id)
  WHERE department_id IS NOT NULL;

COMMENT ON COLUMN public.employees.branch_id IS
  '所屬分公司（FK → branches.id）。NULL = 未分配、客戶沒分公司全 NULL、scope 規則退化';
COMMENT ON COLUMN public.employees.department_id IS
  '所屬部門（FK → departments.id）。NULL = 未分部門、scope 規則退回個人 / cross_department cap';
COMMENT ON COLUMN public.employees.is_dept_manager IS
  '部門主管旗標（true = 部門 scope、可看 / 改部門員工的 team row）';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 確保 branches / departments RLS 守住（檢查既有 policy、不夠補）
--    既有可能已有 RLS、這裡只 ENABLE、不重建 policy（避免破壞既有）
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 確保至少有 SELECT policy（同 workspace 看得到）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='branches' AND cmd='SELECT'
  ) THEN
    CREATE POLICY branches_select_own ON public.branches FOR SELECT
      TO authenticated
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
    RAISE NOTICE '✓ branches_select_own policy 已建立';
  ELSE
    RAISE NOTICE '○ branches 已有 SELECT policy、不重建';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='departments' AND cmd='SELECT'
  ) THEN
    CREATE POLICY departments_select_own ON public.departments FOR SELECT
      TO authenticated
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
        )
      );
    RAISE NOTICE '✓ departments_select_own policy 已建立';
  ELSE
    RAISE NOTICE '○ departments 已有 SELECT policy、不重建';
  END IF;
END $$;

-- 確保有 WRITE policy（hr.employees.write 才能改）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='branches' AND cmd='ALL'
  ) THEN
    CREATE POLICY branches_write_with_cap ON public.branches FOR ALL
      TO authenticated
      USING (
        public.has_capability_for_workspace(workspace_id, 'hr.employees.write')
      )
      WITH CHECK (
        public.has_capability_for_workspace(workspace_id, 'hr.employees.write')
      );
    RAISE NOTICE '✓ branches_write_with_cap policy 已建立';
  ELSE
    RAISE NOTICE '○ branches 已有 ALL policy、不重建';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='departments' AND cmd='ALL'
  ) THEN
    CREATE POLICY departments_write_with_cap ON public.departments FOR ALL
      TO authenticated
      USING (
        public.has_capability_for_workspace(workspace_id, 'hr.employees.write')
      )
      WITH CHECK (
        public.has_capability_for_workspace(workspace_id, 'hr.employees.write')
      );
    RAISE NOTICE '✓ departments_write_with_cap policy 已建立';
  ELSE
    RAISE NOTICE '○ departments 已有 ALL policy、不重建';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 註：cross_branch / cross_department capability 由 application-side 註冊
--    （capabilities.ts）+ platform admin 在 HR 介面手動勾。
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
