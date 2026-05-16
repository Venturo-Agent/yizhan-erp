-- =============================================================================
-- 005_channel_seed.sql — Channel 系統 seed data
-- =============================================================================
-- 依賴：004_channel_system.sql 已 apply
--
-- 為每個現有 workspace 建：
--   1. HAPPY 系統員工（is_bot=true、不能登入）
--   2. 3 個 announcement 頻道：#重要事項 / #日常公告 / #表揚 & 紀錄
--   3. 1 個 system_notice 頻道：#系統通知
--   4. 全 workspace 員工自動加入上述 4 個系統頻道
--
-- 不在 seed 範圍（應用層 lazy 建）：
--   - 員工 ↔ HAPPY DM（員工第一次點 HAPPY 才建）
--   - 員工 ↔ 員工 DM（要私訊誰才建）
--   - blank / project 頻道（純手動建）
--
-- 未來新 workspace：要靠應用層 onboarding hook 補 seed、或 trigger（v2 再加）
-- =============================================================================

BEGIN;

-- ============================================
-- 0a. workspace_features 預設為現存 workspace 啟用 channels
--    對齊 CLAUDE.md 維度 8「租戶/HR/路由三層對齊」
--    新 workspace 由應用層 onboarding 補 seed
-- ============================================
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT w.id, 'channels', true
FROM public.workspaces w
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- ============================================
-- 0b. role_capabilities 預設給所有 role 啟用 read/write
--    manage 只給 admin / 老闆 級 role
--
--    rule：只要該 role 在 workspace_roles 表內、就視為可使用基本 channel 功能
--    （read + write）。manage 限 role.name 含 'admin' / '老闆' / 'owner'
-- ============================================
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, 'channels.read', true
FROM public.workspace_roles wr
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, 'channels.write', true
FROM public.workspace_roles wr
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, 'channels.manage', true
FROM public.workspace_roles wr
WHERE wr.name ILIKE '%admin%'
   OR wr.name ILIKE '%老闆%'
   OR wr.name ILIKE '%owner%'
   OR wr.name = 'Administrator'
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

-- ============================================
-- 1. 每個 workspace seed HAPPY 員工
-- ============================================
-- employee_type='system_bot' 對齊 20260509155550 migration 已擴展的 CHECK constraint
-- （合法值：'human' | 'bot' | 'system_bot' | 'integration'）
INSERT INTO public.employees (
  workspace_id,
  display_name,
  chinese_name,
  english_name,
  employee_number,
  is_bot,
  status,
  employee_type
)
SELECT
  w.id,
  'HAPPY',
  'HAPPY',
  'HAPPY',
  'BOT-HAPPY',
  true,
  'active',
  'system_bot'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.workspace_id = w.id AND e.is_bot = true AND e.display_name = 'HAPPY'
);

-- ============================================
-- 2. 每個 workspace seed 3 個 announcement 頻道
-- ============================================
INSERT INTO public.channels (workspace_id, type, name, description, is_system)
SELECT w.id, 'announcement', '重要事項', 'policy / 制度變更', true
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c
  WHERE c.workspace_id = w.id AND c.type = 'announcement' AND c.name = '重要事項'
);

INSERT INTO public.channels (workspace_id, type, name, description, is_system)
SELECT w.id, 'announcement', '日常公告', '活動 / 一般佈達', true
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c
  WHERE c.workspace_id = w.id AND c.type = 'announcement' AND c.name = '日常公告'
);

INSERT INTO public.channels (workspace_id, type, name, description, is_system)
SELECT w.id, 'announcement', '表揚 & 紀錄', '業績達成 / 員工生日 / 重要里程碑', true
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c
  WHERE c.workspace_id = w.id AND c.type = 'announcement' AND c.name = '表揚 & 紀錄'
);

-- ============================================
-- 3. 每個 workspace seed 1 個 system_notice 頻道
-- ============================================
INSERT INTO public.channels (workspace_id, type, name, description, is_system)
SELECT w.id, 'system_notice', '系統通知', '系統自動推播（開票提醒 / 應收逾期 / 出發前提示）', true
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c
  WHERE c.workspace_id = w.id AND c.type = 'system_notice' AND c.name = '系統通知'
);

-- ============================================
-- 4. 全員自動加入系統頻道（非 bot 員工 + 該 workspace 所有 system channels）
-- ============================================
INSERT INTO public.channel_members (channel_id, employee_id, role)
SELECT c.id, e.id, 'member'
FROM public.channels c
JOIN public.employees e ON e.workspace_id = c.workspace_id
WHERE c.is_system = true
  AND e.is_bot = false                       -- HAPPY 自己不加入系統頻道（避免循環）
  AND e.deleted_at IS NULL
  AND e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = c.id AND cm.employee_id = e.id
  );

-- ============================================
-- 5. ensure_happy_dm() RPC — 員工第一次進 /channels 時 lazy 建 HAPPY DM
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_happy_dm()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_workspace_id uuid;
  v_happy_id uuid;
  v_channel_id uuid;
BEGIN
  v_employee_id := public.get_current_employee_id();
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.employees WHERE id = v_employee_id;

  SELECT id INTO v_happy_id
  FROM public.employees
  WHERE workspace_id = v_workspace_id
    AND is_bot = true
    AND display_name = 'HAPPY'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_happy_id IS NULL THEN
    RAISE EXCEPTION 'HAPPY not seeded for workspace %', v_workspace_id;
  END IF;

  -- 找既有 DM
  SELECT c.id INTO v_channel_id
  FROM public.channels c
  JOIN public.channel_members cm1 ON cm1.channel_id = c.id AND cm1.employee_id = v_employee_id
  JOIN public.channel_members cm2 ON cm2.channel_id = c.id AND cm2.employee_id = v_happy_id
  WHERE c.workspace_id = v_workspace_id
    AND c.type = 'dm'
    AND c.is_archived = false
  LIMIT 1;

  IF v_channel_id IS NOT NULL THEN
    RETURN v_channel_id;
  END IF;

  -- 沒有就建
  INSERT INTO public.channels (workspace_id, type, name, created_by)
  VALUES (v_workspace_id, 'dm', 'HAPPY', v_employee_id)
  RETURNING id INTO v_channel_id;

  INSERT INTO public.channel_members (channel_id, employee_id, role) VALUES
    (v_channel_id, v_employee_id, 'owner'),
    (v_channel_id, v_happy_id, 'member');

  RETURN v_channel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_happy_dm() TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 應用層後續：
-- - 新員工 onboarding：建完員工後 INSERT 全 system channel member（補應用層 hook）
-- - ChannelsLayout 載入時 call ensure_happy_dm() RPC 確保 HAPPY DM 存在
-- =============================================================================
