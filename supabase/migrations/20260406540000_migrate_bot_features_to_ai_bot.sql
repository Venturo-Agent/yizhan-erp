-- 合併 bot_line + bot_telegram 為 ai_bot
-- 如果原本有開 bot_line 或 bot_telegram，就開 ai_bot

-- 為已有 bot_line 或 bot_telegram 且尚無 ai_bot 的租戶新增 ai_bot
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT DISTINCT workspace_id, 'ai_bot', TRUE
FROM workspace_features
WHERE feature_code IN ('bot_line', 'bot_telegram')
  AND enabled = TRUE
  AND workspace_id NOT IN (
    SELECT workspace_id FROM workspace_features WHERE feature_code = 'ai_bot'
  )
ON CONFLICT DO NOTHING;

-- 刪除舊的 bot_line / bot_telegram 記錄
DELETE FROM workspace_features WHERE feature_code IN ('bot_line', 'bot_telegram');
