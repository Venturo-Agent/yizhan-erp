-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 清舊細顆粒 bot capability、補新粗顆粒
-- 2026-05-14 Robin
--
-- 背景：
--   line_bot / facebook_bot / instagram_bot / messaging_inbox 4 個 module 之前同時設了
--   moduleLevelCapabilities + tabs、codegen 雙吐成「粗 + 細」兩套 capability。
--   不同 workspace 拿到不同 seed → API 用粗顆粒、a89335d4 workspace 系統主管只有細顆粒
--   → 進 /bot 撞「沒有 line_bot.read 權限」錯。
--
--   修法：4 個 module 拔 tabs、code 級 capabilities.ts 已清乾淨（共 14 條死碼）。
--         DB 實際 seed 只有 line_bot 4 條（共 12 row）、其他 3 個 module 純 code 級死碼。
--
-- 本 migration：
--   1. 對「有舊細顆粒」的 role、補上對應粗顆粒（避免功能消失）
--   2. 砍 4 條舊細顆粒（line_bot.conversation.*, line_bot.config.*）
--
-- Idempotent：ON CONFLICT DO NOTHING、可重跑
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1：補粗顆粒（對之前有舊細顆粒的 role）
-- ─────────────────────────────────────────────────────────────────────────────

-- line_bot.conversation.read → 補 line_bot.read
INSERT INTO public.role_capabilities (role_id, capability_code, enabled, created_at)
SELECT DISTINCT rc.role_id, 'line_bot.read', true, NOW()
FROM public.role_capabilities rc
WHERE rc.capability_code IN (
  'line_bot.conversation.read',
  'line_bot.config.read'
)
ON CONFLICT (role_id, capability_code) DO NOTHING;

-- line_bot.conversation.write → 補 line_bot.write
INSERT INTO public.role_capabilities (role_id, capability_code, enabled, created_at)
SELECT DISTINCT rc.role_id, 'line_bot.write', true, NOW()
FROM public.role_capabilities rc
WHERE rc.capability_code IN (
  'line_bot.conversation.write'
)
ON CONFLICT (role_id, capability_code) DO NOTHING;

-- line_bot.config.{read,write} → 補 line_bot.config
INSERT INTO public.role_capabilities (role_id, capability_code, enabled, created_at)
SELECT DISTINCT rc.role_id, 'line_bot.config', true, NOW()
FROM public.role_capabilities rc
WHERE rc.capability_code IN (
  'line_bot.config.read',
  'line_bot.config.write'
)
ON CONFLICT (role_id, capability_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2：砍舊細顆粒
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.role_capabilities WHERE capability_code IN (
  -- line_bot
  'line_bot.conversation.read',
  'line_bot.conversation.write',
  'line_bot.config.read',
  'line_bot.config.write',
  -- facebook_bot（純 code 級死碼、DB 應該沒、保險砍）
  'facebook_bot.conversation.read',
  'facebook_bot.conversation.write',
  'facebook_bot.config.read',
  'facebook_bot.config.write',
  -- instagram_bot（同上）
  'instagram_bot.conversation.read',
  'instagram_bot.conversation.write',
  'instagram_bot.config.read',
  'instagram_bot.config.write',
  -- messaging_inbox（同上）
  'messaging_inbox.conversations.read',
  'messaging_inbox.conversations.write'
);

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- 注意：rollback 後死碼會回來、但 a89335d4 系統主管的粗顆粒不會自動消失
-- 需手動：DELETE FROM role_capabilities WHERE capability_code IN ('line_bot.read', ...) AND role_id IN (... 之前補上的 role)
-- BEGIN;
-- INSERT INTO role_capabilities (role_id, capability_code, enabled)
-- SELECT role_id, 'line_bot.conversation.read', true
-- FROM role_capabilities WHERE capability_code = 'line_bot.read'
-- ON CONFLICT DO NOTHING;
-- -- 同理補回其他 3 條
-- COMMIT;
