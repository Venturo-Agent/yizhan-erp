-- ════════════════════════════════════════════════════════════════════════
-- Channels Phase 1+2：官方頻道 seed + HAPPY 機器人接通
--
-- 5/13 William 拍板：
--   - 各 workspace 既有 4 個 channels（重要事項 / 日常公告 / 表揚紀錄 / 系統通知）
--     全部標 is_official=true、員工自動可見
--   - 公告類 3 個限發言、其他人只能 reply 留言
--   - 補建 HAPPY 機器人 channel × 4 workspaces（agent_id 連 ai_agents.HAPPY）
--   - workspace_features 加 'channels.happy' 預設啟用（客戶 onboarding 後可關）
--
-- 動作：
--   1. workspace_features 'channels.happy' INSERT × 4 workspaces（漫途 + 3 客戶）
--   2. UPDATE 16 個既有 channels SET is_official=true
--   3. UPDATE 公告類 12 個（4 workspace × 3 公告）SET post_permission='capability:channels.announcement.post'
--   4. INSERT HAPPY 機器人 channel × 4 workspaces、agent_id 對應該 workspace 的 HAPPY agent
--   5. INSERT channel_members 自動 enroll 既有 active human 員工到新 HAPPY channel
--
-- 不動：
--   - 既有 channel_members（已有的 enrollment 不重複加）
--   - 既有 messages
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. workspace_features 'channels.happy' 開給所有現有 workspace
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'channels.happy', true
FROM public.workspaces
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = EXCLUDED.enabled;

-- 2. 既有 16 個 channels 全標 is_official（公告 / 系統通知都是公司級別）
UPDATE public.channels
SET is_official = true
WHERE type IN ('announcement', 'system_notice');

-- 3. 公告類限發言（capability:channels.announcement.post）
--    其他人 reply 留言不需 capability（一律放行）
UPDATE public.channels
SET post_permission = 'capability:channels.announcement.post'
WHERE type = 'announcement';

-- 4. 每個 workspace 補建 HAPPY 機器人 channel
--    ON CONFLICT 比較難處理（沒 unique constraint）、用 NOT EXISTS 防重複
INSERT INTO public.channels (workspace_id, type, name, description, agent_id, is_system, is_official, post_permission, created_at, updated_at)
SELECT
  a.workspace_id,
  'bot' AS type,
  'HAPPY' AS name,
  '哈比機器人、能幫你查訂單 / 客戶 / 旅遊團資料' AS description,
  a.id AS agent_id,
  true AS is_system,
  true AS is_official,
  'all' AS post_permission,
  now(),
  now()
FROM public.ai_agents a
WHERE a.code = 'HAPPY'
  AND NOT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.workspace_id = a.workspace_id AND c.type = 'bot' AND c.agent_id = a.id
  );

-- 5. 既有 active human 員工自動 enroll 到所有 is_official channels
--    （包含新建的 HAPPY channel）
INSERT INTO public.channel_members (channel_id, employee_id, joined_at)
SELECT c.id, e.id, now()
FROM public.channels c
CROSS JOIN public.employees e
WHERE c.is_official = true
  AND e.workspace_id = c.workspace_id
  AND e.status = 'active'
  AND e.employee_type = 'human'
  AND e.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = c.id AND cm.employee_id = e.id
  );

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- 危險：rollback 不會還原已自動 enroll 的 channel_members（這些 row 本來就該存在）
-- BEGIN;
-- DELETE FROM public.channels WHERE type = 'bot' AND name = 'HAPPY';  -- channel_members CASCADE
-- UPDATE public.channels SET post_permission = 'all' WHERE type = 'announcement';
-- UPDATE public.channels SET is_official = false WHERE type IN ('announcement', 'system_notice');
-- DELETE FROM public.workspace_features WHERE feature_code = 'channels.happy';
-- COMMIT;
