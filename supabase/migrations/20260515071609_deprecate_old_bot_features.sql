-- ─────────────────────────────────────────────────────────────────────────────
-- Deprecate 舊 4 個 bot/messaging features、整合進 ai_hub
--
-- 寫於：2026-05-15 07:16（Robin、男僕）
--
-- 對應變更：
--   - src/modules/{line_bot, facebook_bot, instagram_bot, messaging_inbox}.ts 標 deprecated
--   - _registry.ts 移除這 4 個 module（codegen 後 features.ts / capabilities.ts 不再含）
--   - 18 處 caller capability reference 已批次改成 CAPABILITIES.AI_HUB_*
--
-- 目的：
--   5/14 William 拍板「全部整合、舊 4 module deprecated + DB 也 cleanup」。
--   原本租戶管理 UI 會看到 5 個 AI 相關付費 feature（line_bot / facebook_bot / instagram_bot
--   / messaging_inbox / ai_hub）、admin 不知道勾哪個。整合後 UI 只看到 ai_hub 一個 SKU。
--
-- 保守設計：
--   - workspace_features：UPDATE SET enabled=false（保留 row、可隨時 SET true 還原）
--   - role_capabilities：DELETE（capabilities.ts 已不存在、保留 row 是 dead record）
--   - 既有 ai_hub.read/write 已在 5/14 seed migration 給漫途 admin/manager（不重複 seed）
--
-- 紀律：
--   - 全 idempotent（重跑安全）
--   - 不動 LINE / FB / IG webhook DB 表（line_conversation_messages 等）— Phase 2 才動
--   - 不動 settings 表（workspace_line_settings / workspace_facebook_settings 等）— 還在使用
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- 1. workspace_features 設成 false（保留 row、可還原）
-- ════════════════════════════════════════════════════════════════════

UPDATE workspace_features
   SET enabled = false,
       updated_at = NOW()
 WHERE feature_code IN ('line_bot', 'facebook_bot', 'instagram_bot', 'messaging_inbox')
   AND enabled = true;

-- ════════════════════════════════════════════════════════════════════
-- 2. role_capabilities 砍舊 capability rows
-- ════════════════════════════════════════════════════════════════════

DELETE FROM role_capabilities
 WHERE capability_code LIKE 'line_bot.%'
    OR capability_code LIKE 'facebook_bot.%'
    OR capability_code LIKE 'instagram_bot.%'
    OR capability_code LIKE 'messaging_inbox.%';

-- ════════════════════════════════════════════════════════════════════
-- 3. 確保 ai_hub feature 在所有 workspace 啟用（idempotent、跟 5/14 seed 一致）
-- ════════════════════════════════════════════════════════════════════

INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'ai_hub', true
  FROM workspaces
 WHERE deleted_at IS NULL
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- ════════════════════════════════════════════════════════════════════
-- 4. 改寫 inbox_conversations RLS policy
--    原本 channel-aware（line_bot.write / facebook_bot.write / instagram_bot.write）
--    現在統一走 ai_hub.write（呼應 capability deprecate）
-- ════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS inbox_conv_update_own ON public.inbox_conversations;

CREATE POLICY inbox_conv_update_own
  ON public.inbox_conversations FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND public.has_capability_for_workspace(workspace_id, 'ai_hub.write')
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND public.has_capability_for_workspace(workspace_id, 'ai_hub.write')
  );

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一 caller 還有 ref 舊 capability、先還原舊 feature 再除錯）════
-- BEGIN;
-- UPDATE workspace_features
--    SET enabled = true, updated_at = NOW()
--  WHERE feature_code IN ('line_bot', 'facebook_bot', 'instagram_bot', 'messaging_inbox');
-- -- role_capabilities 還原要重跑 seed（沒備份就回不來、要從 git 翻舊 seed migration）
-- COMMIT;
