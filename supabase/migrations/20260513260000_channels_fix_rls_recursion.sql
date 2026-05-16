-- ════════════════════════════════════════════════════════════════════════
-- Hotfix：channels / channel_members RLS 無限遞迴
--
-- 問題：
--   channel_members_select policy 自我引用：
--     EXISTS (SELECT 1 FROM channel_members cm2 WHERE ...)
--   PostgreSQL 偵測到 self-recursion、整個 channels / channel_members 查詢失敗
--   錯誤：infinite recursion detected in policy for relation "channel_members"
--
-- 修法：
--   用 SECURITY DEFINER function 包查詢、function 內查 channel_members 不會
--   再觸發 RLS、打斷遞迴。
--
-- 動作：
--   1. CREATE FUNCTION is_channel_member / is_channel_owner（SECURITY DEFINER）
--   2. DROP + CREATE channel_members 4 個 policy（改用 function、不自我引用）
--   3. DROP + CREATE channels 3 個 policy（select / update / delete、引用 function）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Helper functions（SECURITY DEFINER 繞 RLS、打斷遞迴）
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id AND employee_id = p_employee_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_owner(p_channel_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id
      AND employee_id = p_employee_id
      AND role = 'owner'
  );
$$;

-- ────────────────────────────────────────────────────────────────
-- channel_members policies 重寫
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS channel_members_select ON public.channel_members;
CREATE POLICY channel_members_select ON public.channel_members
FOR SELECT
USING (public.is_channel_member(channel_id, public.get_current_employee_id()));

DROP POLICY IF EXISTS channel_members_insert ON public.channel_members;
CREATE POLICY channel_members_insert ON public.channel_members
FOR INSERT
WITH CHECK (public.is_channel_owner(channel_id, public.get_current_employee_id()));

DROP POLICY IF EXISTS channel_members_update ON public.channel_members;
CREATE POLICY channel_members_update ON public.channel_members
FOR UPDATE
USING (employee_id = public.get_current_employee_id());

DROP POLICY IF EXISTS channel_members_delete ON public.channel_members;
CREATE POLICY channel_members_delete ON public.channel_members
FOR DELETE
USING (
  -- DM channel 的 member 不准 delete（無法離開 DM、要 archive channel）
  NOT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_members.channel_id AND c.type = 'dm'
  )
  AND (
    employee_id = public.get_current_employee_id()
    OR public.is_channel_owner(channel_id, public.get_current_employee_id())
  )
);

-- ────────────────────────────────────────────────────────────────
-- channels policies 重寫（不再 inline 查 channel_members、改用 function）
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS channels_select ON public.channels;
CREATE POLICY channels_select ON public.channels
FOR SELECT
USING (
  workspace_id = public.get_current_user_workspace()
  AND (
    is_system = true
    OR is_official = true
    OR public.is_channel_member(id, public.get_current_employee_id())
  )
);

DROP POLICY IF EXISTS channels_update ON public.channels;
CREATE POLICY channels_update ON public.channels
FOR UPDATE
USING (
  is_system = false
  AND public.is_channel_owner(id, public.get_current_employee_id())
);

DROP POLICY IF EXISTS channels_delete ON public.channels;
CREATE POLICY channels_delete ON public.channels
FOR DELETE
USING (
  is_system = false
  AND public.is_channel_owner(id, public.get_current_employee_id())
);

-- channels_insert 沒查 channel_members、不需動

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════ Rollback（萬一爆炸、複製貼上跑 — 還原成有 recursion 的舊版）════
-- 不建議 rollback、舊版會炸（recursion error）。如真要還原、從 git history 抓
-- 5/13 前的 channel RLS migration。
