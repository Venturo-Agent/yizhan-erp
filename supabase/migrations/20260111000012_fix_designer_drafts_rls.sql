-- 修復 designer_drafts RLS 政策
-- 問題：get_current_user_workspace() 可能返回 NULL 導致 INSERT 失敗

BEGIN;

-- 刪除舊的 INSERT 政策
DROP POLICY IF EXISTS "designer_drafts_insert" ON public.designer_drafts;

-- 建立新的 INSERT 政策（更寬鬆：允許已認證用戶插入自己 workspace 的資料）
DROP POLICY IF EXISTS "designer_drafts_insert" ON public.designer_drafts;
CREATE POLICY "designer_drafts_insert" ON public.designer_drafts FOR INSERT
WITH CHECK (
  -- 條件 1：workspace_id 匹配 get_current_user_workspace()
  workspace_id = get_current_user_workspace()
  OR
  -- 條件 2：user_id 是當前認證用戶（作為備用檢查）
  user_id = auth.uid()
  OR
  -- 條件 3：super admin 可以插入任何 workspace
  is_super_admin()
);

-- 也更新 SELECT 政策以允許用戶查看自己的草稿
DROP POLICY IF EXISTS "designer_drafts_select" ON public.designer_drafts;
DROP POLICY IF EXISTS "designer_drafts_select" ON public.designer_drafts;
CREATE POLICY "designer_drafts_select" ON public.designer_drafts FOR SELECT
USING (
  workspace_id = get_current_user_workspace()
  OR user_id = auth.uid()
  OR is_super_admin()
);

-- 更新 UPDATE 政策
DROP POLICY IF EXISTS "designer_drafts_update" ON public.designer_drafts;
DROP POLICY IF EXISTS "designer_drafts_update" ON public.designer_drafts;
CREATE POLICY "designer_drafts_update" ON public.designer_drafts FOR UPDATE
USING (
  workspace_id = get_current_user_workspace()
  OR user_id = auth.uid()
  OR is_super_admin()
);

-- 更新 DELETE 政策
DROP POLICY IF EXISTS "designer_drafts_delete" ON public.designer_drafts;
DROP POLICY IF EXISTS "designer_drafts_delete" ON public.designer_drafts;
CREATE POLICY "designer_drafts_delete" ON public.designer_drafts FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR user_id = auth.uid()
  OR is_super_admin()
);

COMMIT;
