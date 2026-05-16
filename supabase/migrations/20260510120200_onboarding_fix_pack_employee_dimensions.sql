-- ============================================================================
-- Migration: Onboarding fix pack #3 — 員工 ↔ 三維 M:N
-- Date: 2026-05-10
-- 對應 02-資料表結構.md 第二節
-- ============================================================================

-- employee_brands
CREATE TABLE IF NOT EXISTS employee_brands (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, brand_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_brands_one_primary
  ON employee_brands (employee_id) WHERE is_primary = true;

-- employee_branches
CREATE TABLE IF NOT EXISTS employee_branches (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, branch_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_branches_one_primary
  ON employee_branches (employee_id) WHERE is_primary = true;

-- employee_departments
CREATE TABLE IF NOT EXISTS employee_departments (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, department_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_departments_one_primary
  ON employee_departments (employee_id) WHERE is_primary = true;
