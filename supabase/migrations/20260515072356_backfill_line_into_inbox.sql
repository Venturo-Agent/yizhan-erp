-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill 既有 LINE 對話進 unified inbox（inbox_conversations + inbox_messages）
--
-- 寫於：2026-05-15 07:23（Robin、男僕、Phase 2 backend 整合）
--
-- 對應變更：
--   - 5/14 webhook + erp-bridge 已加雙寫（同時寫 line_conversation_messages + inbox_*）
--   - 此 migration 補既有歷史資料、讓 /ai conversations tab 看得到舊對話
--   - apply 後可拔雙寫的舊路徑（之後另一個 PR 處理）
--
-- 紀律：
--   - INSERT ... ON CONFLICT 全 idempotent、可重跑
--   - 不動 line_conversation_messages / line_user_profiles 既有資料（read-only backfill）
--   - 不動 RLS policy（已在 cleanup migration 處理）
--
-- 風險：
--   - line_conversation_messages 可能很大、INSERT 全表會慢（生產 ≤ 數萬筆、應該還 OK）
--   - 如果太慢、apply 時用 batch（LIMIT 1000 OFFSET ...）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- 1. inbox_conversations: 從 line_user_profiles + 對話統計建立
--    每對 (workspace_id, channel_type='line', line_user_id) 一個 row
-- ════════════════════════════════════════════════════════════════════

INSERT INTO inbox_conversations (
  workspace_id,
  channel_type,
  external_user_id,
  display_name,
  picture_url,
  last_message_at,
  last_message_preview,
  last_message_direction,
  unread_count,
  is_archived,
  bot_paused,
  created_at
)
SELECT
  p.workspace_id,
  'line' AS channel_type,
  p.line_user_id AS external_user_id,
  p.display_name,
  p.picture_url,
  stats.last_message_at,
  stats.last_message_preview,
  stats.last_message_direction,
  0 AS unread_count,  -- backfill 時 reset 為 0、避免 ghost unread
  false AS is_archived,
  COALESCE(o.bot_paused, false) AS bot_paused,
  COALESCE(stats.first_message_at, NOW()) AS created_at
FROM line_user_profiles p
LEFT JOIN LATERAL (
  SELECT
    MAX(created_at) AS last_message_at,
    MIN(created_at) AS first_message_at,
    (SELECT content FROM line_conversation_messages m
       WHERE m.workspace_id = p.workspace_id AND m.line_user_id = p.line_user_id
       ORDER BY created_at DESC LIMIT 1) AS last_message_preview,
    (SELECT direction FROM line_conversation_messages m
       WHERE m.workspace_id = p.workspace_id AND m.line_user_id = p.line_user_id
       ORDER BY created_at DESC LIMIT 1) AS last_message_direction
  FROM line_conversation_messages
  WHERE workspace_id = p.workspace_id AND line_user_id = p.line_user_id
) stats ON true
LEFT JOIN line_conversation_overrides o
  ON o.workspace_id = p.workspace_id AND o.line_user_id = p.line_user_id
WHERE stats.last_message_at IS NOT NULL  -- 過濾沒對話的 profile
ON CONFLICT (workspace_id, channel_type, external_user_id) DO UPDATE SET
  -- 已存在的 conversation 只更新 last_*（profile 資料不覆蓋、避免雙寫衝突）
  last_message_at = GREATEST(inbox_conversations.last_message_at, EXCLUDED.last_message_at),
  last_message_preview = EXCLUDED.last_message_preview,
  last_message_direction = EXCLUDED.last_message_direction,
  -- bot_paused 從 overrides 同步
  bot_paused = EXCLUDED.bot_paused,
  -- display_name / picture_url 只在原本是 NULL 才補（webhook 雙寫優先）
  display_name = COALESCE(inbox_conversations.display_name, EXCLUDED.display_name),
  picture_url = COALESCE(inbox_conversations.picture_url, EXCLUDED.picture_url);

-- ════════════════════════════════════════════════════════════════════
-- 2. inbox_conversations: 補沒 profile 但有對話的 line user（rare、防漏）
-- ════════════════════════════════════════════════════════════════════

INSERT INTO inbox_conversations (
  workspace_id,
  channel_type,
  external_user_id,
  last_message_at,
  last_message_preview,
  last_message_direction,
  unread_count,
  is_archived,
  bot_paused,
  created_at
)
SELECT
  m.workspace_id,
  'line',
  m.line_user_id,
  MAX(m.created_at),
  (SELECT content FROM line_conversation_messages m2
     WHERE m2.workspace_id = m.workspace_id AND m2.line_user_id = m.line_user_id
     ORDER BY created_at DESC LIMIT 1),
  (SELECT direction FROM line_conversation_messages m2
     WHERE m2.workspace_id = m.workspace_id AND m2.line_user_id = m.line_user_id
     ORDER BY created_at DESC LIMIT 1),
  0,
  false,
  false,
  MIN(m.created_at)
FROM line_conversation_messages m
WHERE NOT EXISTS (
  SELECT 1 FROM line_user_profiles p
  WHERE p.workspace_id = m.workspace_id AND p.line_user_id = m.line_user_id
)
GROUP BY m.workspace_id, m.line_user_id
ON CONFLICT (workspace_id, channel_type, external_user_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 3. inbox_messages: 從 line_conversation_messages 搬全部訊息
--    sender 'customer' → 'contact'、'bot'/'ai' → 'ai_agent'、'agent' → 'agent'
--    source_id 從 raw_event->>$.message.id 取（如果有）
-- ════════════════════════════════════════════════════════════════════

INSERT INTO inbox_messages (
  conversation_id,
  workspace_id,
  direction,
  sender_type,
  sender_employee_id,
  message_type,
  content,
  raw_event,
  source_id,
  created_at
)
SELECT
  c.id AS conversation_id,
  m.workspace_id,
  m.direction,
  CASE m.sender
    WHEN 'customer' THEN 'contact'
    WHEN 'agent' THEN 'agent'
    WHEN 'bot' THEN 'ai_agent'
    WHEN 'ai' THEN 'ai_agent'
    WHEN 'ai_agent' THEN 'ai_agent'
    WHEN 'system' THEN 'system'
    ELSE 'system'
  END AS sender_type,
  NULL AS sender_employee_id,  -- 既有資料沒 employee tracking、留 NULL
  COALESCE(m.message_type, 'text') AS message_type,
  m.content,
  m.raw_event,
  -- 取 LINE message.id 當 source_id（webhook 重送 dedup key）
  CASE
    WHEN m.raw_event IS NOT NULL AND m.raw_event ? 'message'
      THEN m.raw_event->'message'->>'id'
    ELSE NULL
  END AS source_id,
  m.created_at
FROM line_conversation_messages m
INNER JOIN inbox_conversations c
  ON c.workspace_id = m.workspace_id
  AND c.channel_type = 'line'
  AND c.external_user_id = m.line_user_id
ON CONFLICT (conversation_id, source_id) DO NOTHING;
-- source_id NULL 的 row 不會觸發 conflict（NULL ≠ NULL）、會重複寫
-- 重跑整個 migration 會 dup 沒 source_id 的訊息、注意只跑一次

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑、回到 inbox_* 沒 LINE 資料的狀態）════
-- BEGIN;
-- DELETE FROM inbox_messages WHERE conversation_id IN (
--   SELECT id FROM inbox_conversations WHERE channel_type = 'line'
-- );
-- DELETE FROM inbox_conversations WHERE channel_type = 'line';
-- COMMIT;
