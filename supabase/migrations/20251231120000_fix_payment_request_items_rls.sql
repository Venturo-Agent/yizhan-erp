-- 修復 payment_request_items RLS 政策
-- 使用現有的 helper functions
BEGIN;

-- 1. 確保 RLS 已啟用
ALTER TABLE public.payment_request_items ENABLE ROW LEVEL SECURITY;

-- 2. 刪除舊的 policies（如果存在）
DROP POLICY IF EXISTS "payment_request_items_select_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_insert_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_update_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_delete_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_all_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_select" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_insert" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_update" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_delete" ON public.payment_request_items;

-- 3. 建立新的 RLS 政策（使用 helper functions）
-- SELECT: 允許認證用戶查看自己 workspace 的資料
DROP POLICY IF EXISTS "payment_request_items_select" ON public.payment_request_items;
CREATE POLICY "payment_request_items_select" ON public.payment_request_items
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- INSERT: 允許認證用戶新增到自己的 workspace
DROP POLICY IF EXISTS "payment_request_items_insert" ON public.payment_request_items;
CREATE POLICY "payment_request_items_insert" ON public.payment_request_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- UPDATE: 允許認證用戶更新自己 workspace 的資料
DROP POLICY IF EXISTS "payment_request_items_update" ON public.payment_request_items;
CREATE POLICY "payment_request_items_update" ON public.payment_request_items
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- DELETE: 允許認證用戶刪除自己 workspace 的資料
DROP POLICY IF EXISTS "payment_request_items_delete" ON public.payment_request_items;
CREATE POLICY "payment_request_items_delete" ON public.payment_request_items
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IS NULL
    OR workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

COMMIT;
