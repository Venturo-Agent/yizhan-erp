-- ============================================
-- 重新啟用員工 RLS（修正之前錯誤的禁用）
-- ============================================
-- 問題：之前錯誤禁用了 employees 的 RLS
-- 解決：重新啟用 RLS 並確保正確的策略
-- ============================================

BEGIN;

-- 1. 重新啟用 RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 2. 確保所有員工都有 workspace_id（修復 NULL）
UPDATE public.employees
SET workspace_id = (
  SELECT id FROM public.workspaces WHERE code = 'corner' LIMIT 1
)
WHERE workspace_id IS NULL;

-- 3. 刪除所有現有的 policies（重新建立）
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

-- 4. 重建 SELECT policy
-- 可以看到：
-- a) Super Admin 可看全部
-- b) 系統機器人對所有人可見（兩種識別方式）
-- c) 同工作空間的員工
-- d) 其他工作空間的超級管理員（用於跨工作空間溝通）
-- e) 自己的記錄（用於登入同步，當 workspace 尚未設定時）
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT
USING (
  is_super_admin()
  OR id = '00000000-0000-0000-0000-000000000001'  -- 系統機器人 (by id)
  OR employee_number = 'BOT001'  -- 系統機器人 (by employee_number)
  OR workspace_id = get_current_user_workspace()  -- 同工作空間
  OR 'super_admin' = ANY(permissions)  -- 超級管理員對所有人可見
  OR (get_current_user_workspace() IS NULL AND supabase_user_id = auth.uid())  -- 自己（登入同步用）
);

-- 5. INSERT policy：只能新增到自己 workspace
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT
WITH CHECK (
  is_super_admin()
  OR workspace_id = get_current_user_workspace()
);

-- 6. UPDATE policy：只能更新自己 workspace 的員工
DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE
USING (
  is_super_admin()
  OR workspace_id = get_current_user_workspace()
  OR supabase_user_id = auth.uid()  -- 允許更新自己的記錄（登入同步用）
);

-- 7. DELETE policy：只能刪除自己 workspace 的員工
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees FOR DELETE
USING (
  is_super_admin()
  OR workspace_id = get_current_user_workspace()
);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 員工 RLS 已重新啟用';
  RAISE NOTICE '========================================';
  RAISE NOTICE '規則說明：';
  RAISE NOTICE '  - 員工只能看到同公司的同事';
  RAISE NOTICE '  - 系統機器人對所有人可見';
  RAISE NOTICE '  - 超級管理員可以跨公司查看';
  RAISE NOTICE '  - 其他公司的超級管理員也可見';
  RAISE NOTICE '========================================';
END $$;
