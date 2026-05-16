-- ============================================
-- Channel Visibility System
-- ============================================
-- 日期: 2025-12-11
-- 目的: 實作頻道可見性和集團頻道功能
-- 參考文檔: CHANNEL_SYSTEM_SPECIFICATION.md

BEGIN;

-- ============================================
-- Part 1: 建立頻道可見性類型
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_visibility') THEN
    CREATE TYPE public.channel_visibility AS ENUM ('private', 'public');
  END IF;
END $$;

-- ============================================
-- Part 2: 為 channels 表格加上欄位
-- ============================================

-- 可見性欄位
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS visibility public.channel_visibility DEFAULT 'private';

-- 集團頻道標記
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS is_company_wide boolean DEFAULT false;

-- 欄位說明
COMMENT ON COLUMN public.channels.visibility IS '
頻道可見性：
  private: 私人頻道，只能邀請
  public: 公開頻道，同分公司可搜尋並加入
';

COMMENT ON COLUMN public.channels.is_company_wide IS '
是否為集團頻道（跨分公司）：
  true: 可以邀請所有分公司的員工，全公司可見（if public）
  false: 只能邀請同分公司的員工
';

-- ============================================
-- Part 3: 更新現有頻道（設定預設值）
-- ============================================

UPDATE public.channels
SET visibility = 'private',
    is_company_wide = false
WHERE visibility IS NULL;

-- ============================================
-- Part 4: 刪除舊的 Channel Policies
-- ============================================

DROP POLICY IF EXISTS "channels_select" ON public.channels;
DROP POLICY IF EXISTS "channels_insert" ON public.channels;
DROP POLICY IF EXISTS "channels_update" ON public.channels;
DROP POLICY IF EXISTS "channels_delete" ON public.channels;

DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;

-- ============================================
-- Part 5: 建立新的 Channel Policies
-- ============================================

-- Channels SELECT Policy
DROP POLICY IF EXISTS "channels_select" ON public.channels;
CREATE POLICY "channels_select" ON public.channels FOR SELECT
USING (
  -- 情況 1: 我是成員 → 一定能看到
  EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = channels.id
    AND employee_id = get_current_employee_id()
  )
  OR
  -- 情況 2: 公開頻道 + 我的分公司 → 能看到
  (visibility = 'public' AND workspace_id = get_current_user_workspace() AND is_company_wide = false)
  OR
  -- 情況 3: 集團公開頻道 → 所有人能看到
  (visibility = 'public' AND is_company_wide = true)
  OR
  -- 情況 4: 超級管理員 → 全部能看到
  is_super_admin()
);

-- Channels INSERT Policy
DROP POLICY IF EXISTS "channels_insert" ON public.channels;
CREATE POLICY "channels_insert" ON public.channels FOR INSERT
WITH CHECK (
  -- 一般員工：只能建立自己分公司的頻道（private/public）
  (
    visibility IN ('private', 'public')
    AND is_company_wide = false
    AND workspace_id = get_current_user_workspace()
  )
  OR
  -- 超級管理員：可以建立集團頻道
  (is_company_wide = true AND is_super_admin())
);

-- Channels UPDATE Policy
DROP POLICY IF EXISTS "channels_update" ON public.channels;
CREATE POLICY "channels_update" ON public.channels FOR UPDATE
USING (
  -- 頻道建立者或超級管理員可以更新
  created_by = auth.uid() OR is_super_admin()
);

-- Channels DELETE Policy
DROP POLICY IF EXISTS "channels_delete" ON public.channels;
CREATE POLICY "channels_delete" ON public.channels FOR DELETE
USING (
  -- 頻道建立者或超級管理員可以刪除
  created_by = auth.uid() OR is_super_admin()
);

-- ============================================
-- Part 6: Channel Members Policies
-- ============================================

-- Channel Members SELECT Policy
DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT
USING (
  -- 我是成員
  employee_id = get_current_employee_id()
  OR
  -- 頻道建立者
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_members.channel_id
    AND c.created_by = auth.uid()
  )
  OR
  -- 超級管理員
  is_super_admin()
);

-- Channel Members INSERT Policy（邀請成員）
DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels c
    LEFT JOIN public.employees invited_emp ON invited_emp.id = channel_members.employee_id
    WHERE c.id = channel_members.channel_id
    AND (
      -- 情況 1: 集團頻道 → 可以邀請任何人
      c.is_company_wide = true
      OR
      -- 情況 2: 分公司頻道 → 只能邀請同分公司的人
      (c.is_company_wide = false AND invited_emp.workspace_id = c.workspace_id)
    )
    -- 且我是頻道建立者或超級管理員
    AND (c.created_by = auth.uid() OR is_super_admin())
  )
);

-- Channel Members DELETE Policy（移除成員）
DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;
CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE
USING (
  -- 自己退出
  employee_id = get_current_employee_id()
  OR
  -- 頻道建立者移除成員
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_members.channel_id
    AND c.created_by = auth.uid()
  )
  OR
  -- 超級管理員
  is_super_admin()
);

COMMIT;

-- ============================================
-- Part 7: 驗證結果
-- ============================================

DO $$
DECLARE
  total_channels INTEGER;
  public_channels INTEGER;
  company_wide_channels INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_channels FROM public.channels;
  SELECT COUNT(*) INTO public_channels FROM public.channels WHERE visibility = 'public';
  SELECT COUNT(*) INTO company_wide_channels FROM public.channels WHERE is_company_wide = true;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Channel Visibility System Enabled!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '  • Total channels: %', total_channels;
  RAISE NOTICE '  • Public channels: %', public_channels;
  RAISE NOTICE '  • Company-wide channels: %', company_wide_channels;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Features:';
  RAISE NOTICE '  • Private channels (只能邀請)';
  RAISE NOTICE '  • Public channels (可搜尋並加入)';
  RAISE NOTICE '  • Company-wide channels (集團頻道，超級管理員)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Rules:';
  RAISE NOTICE '  • 一般員工：建立分公司頻道（private/public）';
  RAISE NOTICE '  • 超級管理員：可建立集團頻道';
  RAISE NOTICE '  • 分公司頻道：只能邀請同分公司員工';
  RAISE NOTICE '  • 集團頻道：可邀請所有分公司員工';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
