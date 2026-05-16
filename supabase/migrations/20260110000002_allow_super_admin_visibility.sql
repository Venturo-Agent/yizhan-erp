-- ============================================
-- 讓超級管理員對所有工作空間可見
-- ============================================
-- 問題：其他工作空間看不到超級管理員
-- 解決：在 SELECT policy 中加入超級管理員的可見性
-- ============================================

BEGIN;

-- 刪除現有的 SELECT policy
DROP POLICY IF EXISTS "employees_select" ON public.employees;

-- 重建 SELECT policy：增加超級管理員可見性
-- 可以看到：
-- 1. Super Admin 可看全部
-- 2. 系統機器人對所有人可見
-- 3. 同工作空間的員工
-- 4. 其他工作空間的超級管理員（用於跨工作空間溝通）
-- 5. 自己的記錄（用於登入同步）
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT
USING (
  is_super_admin()
  OR id = '00000000-0000-0000-0000-000000000001'  -- 系統機器人
  OR employee_number = 'BOT001'  -- 備用：用 employee_number 識別機器人
  OR workspace_id = get_current_user_workspace()  -- 同工作空間
  OR 'super_admin' = ANY(permissions)  -- 超級管理員對所有人可見
  OR (get_current_user_workspace() IS NULL AND supabase_user_id = auth.uid())  -- 自己
);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 超級管理員可見性已更新';
  RAISE NOTICE '========================================';
  RAISE NOTICE '現在所有工作空間都可以看到：';
  RAISE NOTICE '  • 自己工作空間的員工';
  RAISE NOTICE '  • VENTURO 機器人';
  RAISE NOTICE '  • 超級管理員（William）';
  RAISE NOTICE '========================================';
END $$;
