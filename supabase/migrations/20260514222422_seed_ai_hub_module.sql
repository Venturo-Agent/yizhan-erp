-- ─────────────────────────────────────────────────────────────────────────────
-- AI Hub module seed — Phase 1（純路由 + UI 殼）
--
-- 生成：npm run codegen:seed -- --module=ai_hub
-- 寫於：2026-05-14 22:24（Robin、男僕、Phase 1 路由整合）
--
-- 對應：src/modules/ai_hub.ts
--   - feature: ai_hub (premium)
--   - capabilities: ai_hub.read / ai_hub.write
--   - default roles: admin, manager
--
-- 目的：
--   AI 整合平台（合併原 /messaging）需 feature gate + role capability、
--   不靠手動勾、seed 完員工自然看到 AI Hub 入口。
--
-- 紀律：
--   - 全 idempotent（ON CONFLICT 處理）、重跑安全
--   - 不動既有 messaging_inbox feature / capability（Phase 1 向後相容、Phase 2 deprecate）
--   - 對齊執事長 spec v2 `ai_integration` umbrella 概念、命名統一 ai_hub
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- ai_hub (AI Hub) — premium feature
-- ════════════════════════════════════════════════════════════════════

-- 開通 ai_hub feature 給所有 workspace
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'ai_hub', true
FROM workspaces
WHERE deleted_at IS NULL
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- 給 default roles grant ai_hub 所有 capability
-- role: admin
INSERT INTO role_capabilities (role_id, capability_code)
SELECT r.id, cap
FROM workspace_roles r
CROSS JOIN (VALUES
  ('ai_hub.read'),
  ('ai_hub.write')
) AS caps(cap)
WHERE r.code = 'admin'
ON CONFLICT (role_id, capability_code) DO NOTHING;

-- role: manager
INSERT INTO role_capabilities (role_id, capability_code)
SELECT r.id, cap
FROM workspace_roles r
CROSS JOIN (VALUES
  ('ai_hub.read'),
  ('ai_hub.write')
) AS caps(cap)
WHERE r.code = 'manager'
ON CONFLICT (role_id, capability_code) DO NOTHING;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DELETE FROM role_capabilities WHERE capability_code IN ('ai_hub.read', 'ai_hub.write');
-- DELETE FROM workspace_features WHERE feature_code = 'ai_hub';
-- COMMIT;
