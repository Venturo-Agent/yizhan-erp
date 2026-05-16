-- 砍 5/5 拍板「HR 只留員工列表 + 職務管理」後沒清乾淨的死 capability
--
-- 5/5 已決定：原規劃的 attendance / leave / overtime / missed-clock / reports / settings 子頁全砍
-- 5/7 補清：role_capabilities 表還有對應 capability、capabilities.ts 還有 HR_MANAGE_SETTINGS / HR_READ_SETTINGS enum
--
-- 砍的：6 組 × 2 (read+write) = 12 條 capability
-- 保留：hr.payroll.* (/payslip 員工頁 + /api/hr/payslips 在用)
-- 保留：所有 DB 表（紅線 #0、有真實資料）
--
-- William 5/7 拍板：「都可以清理掉」

DELETE FROM public.role_capabilities
WHERE capability_code IN (
  'hr.attendance.read', 'hr.attendance.write',
  'hr.leave.read', 'hr.leave.write',
  'hr.overtime.read', 'hr.overtime.write',
  'hr.missed-clock.read', 'hr.missed-clock.write',
  'hr.reports.read', 'hr.reports.write',
  'hr.settings.read', 'hr.settings.write'
);
