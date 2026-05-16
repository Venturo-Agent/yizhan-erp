-- =============================================
-- Backfill 6 個新 HR capability tabs 給所有 is_admin 的 workspace_role
-- 2026-05-03、跟隨 module-tabs.ts 的更新
--
-- 新增 tabs：attendance / leave / overtime / missed-clock / payroll / reports
-- 每個 tab 給 read + write
--
-- 為什麼只 backfill admin：
--   非 admin 沒 row 自然 enabled = false、HR 介面顯示「未勾」、HR 勾下去就 INSERT
-- =============================================

INSERT INTO role_capabilities (role_id, capability_code, enabled)
SELECT
  r.id,
  caps.code,
  true
FROM workspace_roles r
CROSS JOIN (VALUES
  ('hr.attendance.read'),
  ('hr.attendance.write'),
  ('hr.leave.read'),
  ('hr.leave.write'),
  ('hr.overtime.read'),
  ('hr.overtime.write'),
  ('hr.missed-clock.read'),
  ('hr.missed-clock.write'),
  ('hr.payroll.read'),
  ('hr.payroll.write'),
  ('hr.reports.read'),
  ('hr.reports.write')
) AS caps(code)
WHERE r.is_admin = true
ON CONFLICT (role_id, capability_code) DO UPDATE SET
  enabled = true;
