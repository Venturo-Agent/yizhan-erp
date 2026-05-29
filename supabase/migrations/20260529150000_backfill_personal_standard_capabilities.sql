-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill 個人空間標配 capability（dashboard / calendar / todos）給所有角色
--
-- 寫於：2026-05-29
-- Why（William 回報）：勁揚的「系統主管」(is_admin) 反而沒有 首頁 / 行事曆 / 待辦，
--   其他角色都有。查出既有租戶的 admin 角色（舊版 / Corner 模板建立）漏了這三個
--   個人標配 capability。dashboard.read/write、calendar.*、todos.* 屬「強制給所有員工」、
--   不該被職務權限擋（module 定義 exposedToHr=false、個人空間）。
--
-- 範圍：全平台 46/48 角色缺至少一個（含只缺 write）、7 個 admin 角色缺。
-- 新租戶不受影響（現行 create-tenant-seed 的 admin 從 MODULES 全開、已含這三個）。
--
-- 做法：對所有非 bot 角色 upsert 6 個 capability（3 module × read/write）、
--   enabled=true。已存在但 enabled=false 的也一併打開（DO UPDATE）。
--   role_capabilities.enabled 預設 false、故必須明確設 true。idempotent、可重跑。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

INSERT INTO role_capabilities (role_id, capability_code, enabled)
SELECT r.id, c.cap, true
FROM workspace_roles r
CROSS JOIN (VALUES
  ('dashboard.read'), ('dashboard.write'),
  ('calendar.read'),  ('calendar.write'),
  ('todos.read'),     ('todos.write')
) AS c(cap)
WHERE r.is_system_bot = false
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

COMMIT;

-- ════ Rollback（一般無需；若要收回、把上述 6 個 cap 從非 bot 角色刪除）════
-- BEGIN;
-- DELETE FROM role_capabilities rc
-- USING workspace_roles r
-- WHERE rc.role_id = r.id AND r.is_system_bot = false
--   AND rc.capability_code IN ('dashboard.read','dashboard.write','calendar.read','calendar.write','todos.read','todos.write');
-- COMMIT;
