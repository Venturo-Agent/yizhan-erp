-- ================================================================
-- Migration: Drop employee_job_roles table (ADR-R2 Option A)
-- ================================================================
-- Blueprint: docs/blueprints/16-hr-roles.md § ADR-R2
-- Decided by: William on 2026-04-18
-- Rationale: 單一主職務策略、員工一職、權限跟 role 不跟人
-- 🛑 DO NOT RUN without William approval + backup + verification
-- ================================================================

-- ============ Step 1: Pre-flight checks (跑完看結果、不動資料) ============

-- 1a. 看 employee_job_roles 有多少 row（若 0 可直接刪、若 > 0 要 backup）
-- SELECT COUNT(*) AS rows_to_migrate FROM public.employee_job_roles;

-- 1b. 看 employee_job_roles 分布
-- SELECT employee_id, COUNT(role_id) AS roles_count
-- FROM public.employee_job_roles
-- GROUP BY employee_id
-- HAVING COUNT(role_id) > 1
-- ORDER BY roles_count DESC;
-- 若有員工有 > 1 role、要決定哪個當主 role（寫進 employees.role_id）

-- 1c. 看 employees.role_id 覆蓋率
-- SELECT
--   COUNT(*) AS total_employees,
--   COUNT(role_id) AS has_role_id,
--   COUNT(*) - COUNT(role_id) AS missing_role_id
-- FROM public.employees;
-- 若 missing_role_id > 0、先 backfill 再 drop table

-- ============ Step 2: Backup（若 Step 1 顯示有資料）============

-- CREATE SCHEMA IF NOT EXISTS _archive;
-- CREATE TABLE _archive.employee_job_roles_backup_20260418 AS
--   SELECT * FROM public.employee_job_roles;
-- COMMENT ON TABLE _archive.employee_job_roles_backup_20260418 IS
--   'Backup before DROP per ADR-R2 Option A (2026-04-18, William)';

-- ============ Step 3: Backfill employees.role_id（若有 NULL）============

-- 範例（需 William 決策預設 role）：
-- UPDATE public.employees
-- SET role_id = (SELECT id FROM roles WHERE name = '助理' AND workspace_id = employees.workspace_id LIMIT 1)
-- WHERE role_id IS NULL;

-- ============ Step 4: Drop table ============

-- DROP TABLE IF EXISTS public.employee_job_roles;

-- ============ Step 5: Verify post-drop ============

-- SELECT COUNT(*) FROM public.employees WHERE role_id IS NULL;  -- 應為 0
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'employee_job_roles';  -- 應無

-- ================================================================
-- Rollback plan (若 Step 4 後發現問題):
-- ================================================================
-- CREATE TABLE public.employee_job_roles AS
--   SELECT * FROM _archive.employee_job_roles_backup_20260418;
-- ALTER TABLE public.employee_job_roles ADD PRIMARY KEY (employee_id, role_id);
-- ALTER TABLE public.employee_job_roles
--   ADD CONSTRAINT employee_job_roles_employee_id_fkey
--     FOREIGN KEY (employee_id) REFERENCES employees(id),
--   ADD CONSTRAINT employee_job_roles_role_id_fkey
--     FOREIGN KEY (role_id) REFERENCES roles(id);
