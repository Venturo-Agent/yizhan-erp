-- ============================================================
-- Seed: documents module
-- Purpose: 開通文件中心功能（PDF 合併、編輯、簽名、印章）
-- Created: 2026-05-30
-- ============================================================

BEGIN;

-- 1. 開啟 documents feature（所有 workspace）
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'documents', true
FROM workspaces
WHERE deleted_at IS NULL
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- 2. 給 admin role grant documents 所有 capability
INSERT INTO role_capabilities (role_id, capability_code)
SELECT r.id, cap
FROM workspace_roles r
CROSS JOIN (VALUES
  ('documents.files.read'),
  ('documents.files.write'),
  ('documents.seals.read'),
  ('documents.seals.write')
) AS caps(cap)
WHERE r.code = 'admin'
ON CONFLICT (role_id, capability_code) DO NOTHING;

-- 3. 給 manager role grant documents 所有 capability（常見角色）
INSERT INTO role_capabilities (role_id, capability_code)
SELECT r.id, cap
FROM workspace_roles r
CROSS JOIN (VALUES
  ('documents.files.read'),
  ('documents.files.write'),
  ('documents.seals.read'),
  ('documents.seals.write')
) AS caps(cap)
WHERE r.code = 'manager'
ON CONFLICT (role_id, capability_code) DO NOTHING;

COMMIT;

-- ════ 驗證 ════
-- SELECT feature_code, enabled, COUNT(*) FROM workspace_features WHERE feature_code = 'documents' GROUP BY feature_code, enabled;
-- SELECT r.code, c.capability_code FROM role_capabilities c JOIN workspace_roles r ON r.id = c.role_id WHERE c.capability_code LIKE 'documents.%';