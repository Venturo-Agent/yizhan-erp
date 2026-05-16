-- Migration: Add Test Supplier Workspaces
-- Description: Create test vehicle supplier workspaces for cross-company request testing
-- Date: 2026-01-11

BEGIN;

-- ============================================
-- 1. Insert test vehicle supplier workspaces
-- ============================================

-- 以琳車行
INSERT INTO public.workspaces (id, name, code, type, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '以琳車行',
  'YILIN',
  'vehicle_supplier',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- 宏福車隊
INSERT INTO public.workspaces (id, name, code, type, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '宏福車隊',
  'HONGFU',
  'vehicle_supplier',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Insert test guide supplier workspace
-- ============================================

-- 領航領隊公司
INSERT INTO public.workspaces (id, name, code, type, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '領航領隊',
  'PILOT',
  'guide_supplier',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

COMMIT;
