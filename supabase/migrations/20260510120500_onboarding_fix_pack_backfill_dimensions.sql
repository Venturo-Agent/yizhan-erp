-- ============================================================================
-- Migration: Onboarding fix pack #6 — 既有 workspace / employees 三維 backfill
-- Date: 2026-05-10
-- 對應 02-資料表結構.md 第五節 backfill 邏輯
-- 邏輯：
--   1. 每個 workspace 補 1 筆預設 brand / branch / department（若不存在）
--   2. 每個既有 employee 自動連到所屬 workspace 的預設值（若沒連）
-- ============================================================================

-- 1. 每個 workspace 補預設品牌（用 workspace.name）
INSERT INTO brands (workspace_id, code, name, is_default)
SELECT
  w.id,
  'DEFAULT',
  COALESCE(w.name, '預設品牌'),
  true
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM brands b WHERE b.workspace_id = w.id
);

-- 2. 每個 workspace 補預設分公司「總部」
INSERT INTO branches (workspace_id, code, name, is_default)
SELECT
  w.id,
  'HQ',
  '總部',
  true
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM branches b WHERE b.workspace_id = w.id
);

-- 3. 每個 workspace 補預設部門「總公司」
INSERT INTO departments (workspace_id, code, name, is_default)
SELECT
  w.id,
  'MAIN',
  '總公司',
  true
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.workspace_id = w.id
);

-- 4. 既有員工 backfill 三維關聯（取所屬 workspace 的 default、is_primary=true）
--    跳過已掛 primary 的員工、避免覆蓋
INSERT INTO employee_brands (employee_id, brand_id, is_primary)
SELECT
  e.id,
  b.id,
  true
FROM employees e
JOIN brands b ON b.workspace_id = e.workspace_id AND b.is_default = true
WHERE e.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM employee_brands eb WHERE eb.employee_id = e.id AND eb.is_primary = true
  )
ON CONFLICT (employee_id, brand_id) DO NOTHING;

INSERT INTO employee_branches (employee_id, branch_id, is_primary)
SELECT
  e.id,
  br.id,
  true
FROM employees e
JOIN branches br ON br.workspace_id = e.workspace_id AND br.is_default = true
WHERE e.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM employee_branches eb WHERE eb.employee_id = e.id AND eb.is_primary = true
  )
ON CONFLICT (employee_id, branch_id) DO NOTHING;

INSERT INTO employee_departments (employee_id, department_id, is_primary)
SELECT
  e.id,
  d.id,
  true
FROM employees e
JOIN departments d ON d.workspace_id = e.workspace_id AND d.is_default = true
WHERE e.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM employee_departments ed WHERE ed.employee_id = e.id AND ed.is_primary = true
  )
ON CONFLICT (employee_id, department_id) DO NOTHING;
