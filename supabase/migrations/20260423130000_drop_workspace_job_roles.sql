-- 2026-04-23: 砍 workspace_job_roles（ADR-R2 後 deprecated 的「團務職務」表）
-- EmployeeForm.tsx 註解明寫「2026-04-18 移除：原 employee_job_roles 多對多、ADR-R2 Option A 改單一職務」
-- 3 row Corner 殘留、/api/job-roles/route.ts 0 src fetch（孤兒 API）
-- 跟 active 的 workspace_roles 完全不同概念、不衝突 selector_field_roles
BEGIN;
DROP TABLE IF EXISTS public.workspace_job_roles CASCADE;
COMMIT;
