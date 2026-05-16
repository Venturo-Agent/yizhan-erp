-- Drop employee_permission_overrides — SSOT consolidation
--
-- Reason: 表存在但 0 row、從沒被寫過。原意是「員工個別權限例外」（給某員工 +/- 個別權限）
-- 但實際使用 = 0、UI 也沒人改、permissions[] 完全由 role_tab_permissions 算就夠了。
--
-- 程式碼層多處 try/catch 跑「表可能不存在」的防禦讀取邏輯、是 SSOT 漏洞。
-- 砍掉表 + API + EmployeeForm「職務權限」tab、未來要做個別覆寫再加回來。
--
-- 後續：
-- - DROP TABLE employee_permission_overrides
-- - DELETE src/app/api/employees/[employeeId]/permission-overrides/route.ts
-- - validate-login: 移除 overrides 讀邏輯
-- - permissions/check: 同上
-- - EmployeeForm: 砍「職務權限」tab + personalOverrides + fetch/PUT
-- - supabase/types.ts 同步移除

DROP TABLE IF EXISTS public.employee_permission_overrides CASCADE;
