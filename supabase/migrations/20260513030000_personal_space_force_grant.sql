-- ─────────────────────────────────────────────────────────────────────────────
-- 個人空間 capability 強制給所有 role（5/13 William 拍板）
--
-- 緣起：admin 在 /hr/roles 看到「首頁 / 待辦 / 行事曆 / 頻道 / 個人設定」可勾、
--      但這些是個人空間 / 標配、不該由 HR 配置、應強制給所有員工。
--      「有員工沒這功能也太可憐了」— William
--
-- 對應 modules/ 改動：
--   modules/calendar.ts / todos.ts / channels.ts / settings.ts dashboard.ts
--   全部設 exposedToHr=false（HR /hr/roles 不再顯示）
--
-- 本 migration 對所有現存 workspace_roles 補 grant 這些 capability
-- 全 idempotent（ON CONFLICT DO NOTHING）、可重跑、不破壞已 grant 資料
--
-- 個人空間 capability list：
--   - calendar.read / calendar.write
--   - todos.read / todos.write
--   - channels.read / channels.write（不含 channels.manage、發公告仍 admin 限）
--   - settings.personal.read / settings.personal.write
--   - settings.company.read（settings.company.write 仍 admin 限）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

INSERT INTO role_capabilities (role_id, capability_code)
SELECT r.id, cap
FROM workspace_roles r
CROSS JOIN (VALUES
  ('calendar.read'),
  ('calendar.write'),
  ('todos.read'),
  ('todos.write'),
  ('channels.read'),
  ('channels.write'),
  ('settings.personal.read'),
  ('settings.personal.write'),
  ('settings.company.read')
) AS caps(cap)
ON CONFLICT (role_id, capability_code) DO NOTHING;

-- 完工驗證
DO $$
DECLARE
  v_role_count INT;
  v_grant_count INT;
BEGIN
  SELECT count(*) INTO v_role_count FROM workspace_roles;
  SELECT count(*) INTO v_grant_count
    FROM role_capabilities
    WHERE capability_code IN (
      'calendar.read', 'calendar.write',
      'todos.read', 'todos.write',
      'channels.read', 'channels.write',
      'settings.personal.read', 'settings.personal.write',
      'settings.company.read'
    );

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ 個人空間 capability 強制 grant 完成';
  RAISE NOTICE '  workspace_roles 共：%', v_role_count;
  RAISE NOTICE '  個人空間 grant 共：%（預期 % × 9）', v_grant_count, v_role_count;
  RAISE NOTICE '════════════════════════════════════════════════════════════';

  IF v_grant_count < v_role_count * 9 THEN
    RAISE WARNING '個人空間 capability grant 不齊、有 role 漏 grant（可能 conflict 卡住）';
  END IF;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 未來：新建 role 時要自動 grant 這些 capability
-- 目前未實作 trigger、由 API / UI / onboarding 邏輯處理
-- 之後可加 trigger：CREATE TRIGGER auto_grant_personal_caps ON workspace_roles
-- ─────────────────────────────────────────────────────────────────────────────
