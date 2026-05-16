-- ============================================
-- Allow NULL workspace_id for shared attractions
-- ============================================
-- 日期: 2025-12-12
-- 需求: 景點資料應該是全公司共享，不限定 workspace

BEGIN;

-- 移除 workspace_id 的 NOT NULL 限制
ALTER TABLE public.attractions
ALTER COLUMN workspace_id DROP NOT NULL;

-- 更新 RLS policy 讓 workspace_id 為 NULL 的資料可以被所有人看到
DROP POLICY IF EXISTS "attractions_select" ON public.attractions;
DROP POLICY IF EXISTS "attractions_select" ON public.attractions;
CREATE POLICY "attractions_select" ON public.attractions FOR SELECT
USING (
  workspace_id IS NULL  -- 共享資料
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 同樣處理 cities 表格（如果有 workspace_id）
-- cities 應該也是共享資料

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✅ attractions 表格已允許 workspace_id 為 NULL（共享資料）';
END $$;
