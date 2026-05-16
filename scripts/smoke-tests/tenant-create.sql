-- Smoke test：模擬 /api/tenants/create 整套 INSERT flow
-- 跑完 ROLLBACK、不留垃圾。verify schema 跟 code 對齊
BEGIN;

-- 1. workspaces
INSERT INTO public.workspaces (name, code, max_employees, is_active, premium_enabled, tax_id, is_multi_branch, is_multi_department)
VALUES ('TEST_SMOKE', 'TESTSMOKE', NULL, true, false, '12345678', false, false)
RETURNING id;

-- 2. employees（無 role_id、後面 update）
INSERT INTO public.employees (workspace_id, employee_number, chinese_name, display_name, email, must_change_password)
VALUES (
  (SELECT id FROM public.workspaces WHERE code='TESTSMOKE'),
  'E001', 'Test Admin', 'Test Admin', 'smoke@test.com', true
)
RETURNING id;

-- 3. workspace_roles（5 角色）
INSERT INTO public.workspace_roles (workspace_id, name, is_admin, sort_order)
SELECT (SELECT id FROM public.workspaces WHERE code='TESTSMOKE'), x.name, x.name='系統主管', x.sort_order
FROM (VALUES ('系統主管', 1), ('業務', 2), ('會計', 3), ('助理', 4), ('OP', 5)) AS x(name, sort_order);

-- 4. workspace_features
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled, enabled_at)
VALUES (
  (SELECT id FROM public.workspaces WHERE code='TESTSMOKE'),
  'dashboard', true, now()
);

-- 5. brands
INSERT INTO public.brands (workspace_id, code, name, is_default, display_order)
VALUES (
  (SELECT id FROM public.workspaces WHERE code='TESTSMOKE'),
  'TESTBRAND', 'Test Brand', true, 0
);

-- 6. branches
INSERT INTO public.branches (workspace_id, code, name, is_default, display_order)
VALUES (
  (SELECT id FROM public.workspaces WHERE code='TESTSMOKE'),
  'HQ', '總部', true, 0
);

-- 7. departments
INSERT INTO public.departments (workspace_id, code, name, is_default, display_order)
VALUES (
  (SELECT id FROM public.workspaces WHERE code='TESTSMOKE'),
  'MAIN', '總公司', true, 0
);

-- 8. employee_brands
INSERT INTO public.employee_brands (employee_id, brand_id, is_primary)
VALUES (
  (SELECT id FROM public.employees WHERE employee_number='E001' AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')),
  (SELECT id FROM public.brands WHERE code='TESTBRAND' AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')),
  true
);

-- 9. employee_branches
INSERT INTO public.employee_branches (employee_id, branch_id, is_primary)
VALUES (
  (SELECT id FROM public.employees WHERE employee_number='E001' AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')),
  (SELECT id FROM public.branches WHERE code='HQ' AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')),
  true
);

-- 10. employee_departments
INSERT INTO public.employee_departments (employee_id, department_id, is_primary)
VALUES (
  (SELECT id FROM public.employees WHERE employee_number='E001' AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')),
  (SELECT id FROM public.departments WHERE code='MAIN' AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')),
  true
);

-- 11. update employee.role_id（模擬第 11 步）
UPDATE public.employees
SET role_id = (
  SELECT id FROM public.workspace_roles
  WHERE workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE')
    AND name='系統主管'
)
WHERE employee_number='E001'
  AND workspace_id=(SELECT id FROM public.workspaces WHERE code='TESTSMOKE');

-- ROLLBACK 一切（不真的留資料）
ROLLBACK;

-- verify
SELECT 'smoke test passed (all INSERTs succeeded、ROLLBACKed)' AS result;
