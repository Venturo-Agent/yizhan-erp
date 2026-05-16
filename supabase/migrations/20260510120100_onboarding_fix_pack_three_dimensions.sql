-- ============================================================================
-- Migration: Onboarding fix pack #2 — 三維（品牌／分公司／部門）骨架
-- Date: 2026-05-10
-- 對應 02-資料表結構.md 第一節
--
-- 注意：此 migration 只建主表。
--   - 員工 M:N 關聯 → 20260510120200
--   - 業務表加維度欄位 + trigger → 20260510120300（暫不放、本 fix pack 聚焦 onboarding；
--     等 William/Logan review 通過後、單獨 dispatch 三維業務表 batch）
-- ============================================================================

-- 1. brands（品牌）
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT brands_workspace_code_unique UNIQUE (workspace_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS brands_one_default_per_workspace
  ON brands (workspace_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_brands_workspace ON brands(workspace_id);

COMMENT ON TABLE brands IS '租戶品牌（最少 1 筆 placeholder、is_default=true）';

-- 2. branches（分公司）
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_branch_id UUID REFERENCES branches(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  address TEXT,
  phone TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT branches_workspace_code_unique UNIQUE (workspace_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS branches_one_default_per_workspace
  ON branches (workspace_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_branches_workspace ON branches(workspace_id);

COMMENT ON TABLE branches IS '租戶分公司（最少 1 筆 placeholder「總部」、is_default=true）';

-- 3. departments（部門）
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_department_id UUID REFERENCES departments(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT departments_workspace_code_unique UNIQUE (workspace_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS departments_one_default_per_workspace
  ON departments (workspace_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_departments_workspace ON departments(workspace_id);

COMMENT ON TABLE departments IS '租戶部門（最少 1 筆 placeholder「總公司」、is_default=true）';
