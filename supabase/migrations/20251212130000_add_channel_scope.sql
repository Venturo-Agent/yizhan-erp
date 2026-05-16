-- ============================================
-- Add Channel Scope for Company-Wide Channels
-- ============================================
-- 日期: 2025-12-12
-- 需求: 超級管理員可以建立全集團的頻道

BEGIN;

-- 新增 scope 欄位
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS scope text DEFAULT 'workspace';

-- 加上註解
COMMENT ON COLUMN public.channels.scope IS '
頻道範圍：
  workspace: 分公司頻道（預設）
  company_wide: 全集團頻道
';

-- 更新 RLS policy 讓全集團頻道可以被所有人看到
DROP POLICY IF EXISTS "channels_select" ON public.channels;
DROP POLICY IF EXISTS "channels_select" ON public.channels;
CREATE POLICY "channels_select" ON public.channels FOR SELECT
USING (
  -- 全集團頻道：所有人都可以看
  scope = 'company_wide'
  -- 分公司頻道：同 workspace 或 workspace_id 為 NULL（舊資料）
  OR workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✅ Channel scope 欄位已新增';
  RAISE NOTICE '  • workspace: 分公司頻道';
  RAISE NOTICE '  • company_wide: 全集團頻道';
END $$;
