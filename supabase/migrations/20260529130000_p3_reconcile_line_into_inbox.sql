-- ─────────────────────────────────────────────────────────────────────────────
-- P3：對帳式 backfill — 把只存在於 line_conversation_messages 的訊息補進 unified inbox
--
-- 寫於：2026-05-29（統一對話資料層 spec P3）
-- 對應：workspace/架構整理/2026-05-29-統一對話資料層-spec.md §4 P3
--
-- Why:
--   5/15 已做過大宗 backfill（line_* → inbox_*）。但之後：
--     1. 舊 agent-push route（P2 已刪）只寫 line_conversation_messages、沒寫 inbox_messages
--        → 留下少數「只存在舊表」的 outbound agent 訊息。
--     2. P1 才加 inbox_messages.related_order_id；5/15 backfill 帶不了這欄。
--   P2 已停寫舊表（舊表現已凍結）。P5 DROP 舊表前、inbox 必須是舊表的完整超集、否則丟訊息。
--   此 migration 補上「inbox 沒有對應」的舊 row、並把 related_order_id 一併帶入。
--
-- 對帳現況（2026-05-29 apply 前實測）：
--   舊表 504 筆 / 容忍式比對已在 inbox 502 筆 / 缺 2 筆（5/17 agent 測試 "hi"）。
--   related_order_id：舊表 0 筆有值 → 該欄 backfill 實際為 no-op、但保留邏輯完成 spec。
--
-- 對映：sender → sender_type 與 5/15 backfill 完全一致（customer→contact / bot,ai→ai_agent / agent→agent）。
--
-- 紀律：
--   - idempotent：WHERE NOT EXISTS 容忍式比對（同對話 + 同 direction + 同 content + 時間差 < 60s）防重插。
--     單一 INSERT...SELECT、NOT EXISTS 看的是「本敘述執行前」的 inbox 快照、
--     故同對話內兩筆相近訊息（如 17s 內兩個 "hi"）不會自我抵銷、re-run 也不會 dup。
--   - source_id 取 raw_event.message.id（agent 自發訊息無 id → NULL、沿用 5/15 規則）。
--   - 不動 line_conversation_messages 既有資料（read-only backfill）。
--   - 不動 RLS（既有 inbox_* policy 不受影響、仍過 workspace_id）。
--   - 動表後 NOTIFY pgrst reload schema。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

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
  related_order_id,
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
  NULL AS sender_employee_id,  -- 既有資料無 employee tracking、留 NULL（與 5/15 一致）
  COALESCE(m.message_type, 'text') AS message_type,
  m.content,
  m.raw_event,
  CASE
    WHEN m.raw_event IS NOT NULL AND m.raw_event ? 'message'
      THEN m.raw_event->'message'->>'id'
    ELSE NULL
  END AS source_id,
  m.related_order_id,
  m.created_at
FROM line_conversation_messages m
JOIN inbox_conversations c
  ON c.workspace_id = m.workspace_id
  AND c.channel_type = 'line'
  AND c.external_user_id = m.line_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM inbox_messages im
  WHERE im.conversation_id = c.id
    AND im.direction = m.direction
    AND im.content IS NOT DISTINCT FROM m.content
    AND abs(extract(epoch FROM (im.created_at - m.created_at))) < 60
);

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一要回退此 backfill）════
-- 註：此 backfill 補的是「只存在舊表」的少數 row（apply 前實測 2 筆 agent "hi"）。
-- 若要精準回退、用 created_at 區間 + content 比對手動刪；一般情境無需 rollback。
