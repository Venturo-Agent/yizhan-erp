-- ============================================
-- 修復 employees RLS 和機器人名稱
-- ============================================
-- 1. 為 employees 表格啟用 RLS（跨工作空間隔離）
-- 2. 更新機器人名稱為 "VENTURO 機器人"
-- 3. 修復 DM 功能的 supabase_user_id 問題
-- ============================================

BEGIN;

-- ============================================
-- 1. 更新機器人名稱
-- ============================================
UPDATE public.employees
SET
  display_name = 'VENTURO 機器人',
  chinese_name = 'VENTURO 機器人'
WHERE id = '00000000-0000-0000-0000-000000000001'
   OR employee_number = 'BOT001';

-- ============================================
-- 2. 啟用 employees 表格的 RLS
-- ============================================
-- 注意：employees 表格需要特殊處理
-- - SELECT 需要允許所有已認證用戶（因為 get_current_user_workspace 依賴它）
-- - INSERT/UPDATE/DELETE 限制到自己的 workspace

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 刪除現有的 policies（如果有）
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

-- SELECT: 只能看到自己 workspace 的員工，或是系統機器人
-- 特例：super_admin 可以看到所有，機器人(BOT001)對所有人可見
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT
USING (
  is_super_admin()
  OR id = '00000000-0000-0000-0000-000000000001'  -- 系統機器人對所有人可見
  OR employee_number = 'BOT001'  -- 備用：用 employee_number 識別機器人
  OR workspace_id = get_current_user_workspace()
  -- 備用方案：如果 get_current_user_workspace 返回 NULL，允許用 supabase_user_id 自查
  OR (get_current_user_workspace() IS NULL AND supabase_user_id = auth.uid())
);

-- INSERT: 只能新增到自己 workspace
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT
WITH CHECK (
  is_super_admin()
  OR workspace_id = get_current_user_workspace()
);

-- UPDATE: 只能更新自己 workspace 的員工
DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE
USING (
  is_super_admin()
  OR workspace_id = get_current_user_workspace()
  -- 允許更新自己的 supabase_user_id（用於登入同步）
  OR supabase_user_id = auth.uid()
);

-- DELETE: 只能刪除自己 workspace 的員工
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
  RAISE NOTICE '✅ 修復完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. 機器人名稱已更新為 "VENTURO 機器人"';
  RAISE NOTICE '2. employees 表格 RLS 已啟用';
  RAISE NOTICE '   - 每個工作空間只能看到自己的員工';
  RAISE NOTICE '   - 系統機器人對所有人可見';
  RAISE NOTICE '   - Super Admin 可以跨工作空間查看';
  RAISE NOTICE '========================================';
END $$;
