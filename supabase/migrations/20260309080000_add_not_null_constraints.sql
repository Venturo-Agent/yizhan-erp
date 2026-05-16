-- ============================================================================
-- Add NOT NULL Constraints - Security & Data Integrity
-- ============================================================================
-- Date: 2026-03-09 08:00
-- Author: Matthew (馬修)
-- Priority: P0 - Security Critical
-- 
-- Issue: Core tables allow NULL in critical fields
--   - workspace_id can be NULL → Data isolation fails (SECURITY RISK)
--   - created_at can be NULL → No audit trail
--   - updated_at can be NULL → No change tracking
--   - status can be NULL → Business logic confusion
-- 
-- Pre-check: ✅ All existing data has no NULL values (verified)
-- 
-- This migration:
--   - Add NOT NULL to workspace_id (all 5 core tables)
--   - Add NOT NULL to created_at, updated_at (all 5 core tables)
--   - Add NOT NULL to status (orders, suppliers, tours, quotes)
-- 
-- Time: <1 minute
-- Risk: Very Low (data verified)
-- Impact: Prevents future security vulnerabilities
-- ============================================================================

BEGIN;

-- ============================================================================
-- Customers
-- ============================================================================

ALTER TABLE customers ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE customers ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================================
-- Orders
-- ============================================================================

ALTER TABLE orders ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE orders ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- Suppliers
-- ============================================================================

ALTER TABLE suppliers ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- Tours
-- ============================================================================

ALTER TABLE tours ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE tours ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE tours ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE tours ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- Quotes
-- ============================================================================

ALTER TABLE quotes ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  constraints_count INT;
BEGIN
  -- Verify all NOT NULL constraints are in place
  SELECT COUNT(*) INTO constraints_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('customers', 'orders', 'suppliers', 'tours', 'quotes')
    AND (
      (column_name = 'workspace_id' AND is_nullable = 'NO')
      OR (column_name = 'created_at' AND is_nullable = 'NO')
      OR (column_name = 'updated_at' AND is_nullable = 'NO')
      OR (column_name = 'status' AND is_nullable = 'NO')
    );
  
  -- Expected: 19 constraints
  -- 5 tables × (workspace_id + created_at + updated_at) = 15
  -- 4 tables × status = 4
  -- Total = 19
  
  IF constraints_count < 19 THEN
    RAISE WARNING 'Expected 19 NOT NULL constraints, got %', constraints_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ NOT NULL CONSTRAINTS ADDED';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Applied % NOT NULL constraints:', constraints_count;
  RAISE NOTICE '  • workspace_id: 5 tables (customers, orders, suppliers, tours, quotes)';
  RAISE NOTICE '  • created_at: 5 tables';
  RAISE NOTICE '  • updated_at: 5 tables';
  RAISE NOTICE '  • status: 4 tables (orders, suppliers, tours, quotes)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security improvement:';
  RAISE NOTICE '  ✅ workspace_id cannot be NULL → Data isolation enforced';
  RAISE NOTICE '  ✅ created_at cannot be NULL → Audit trail guaranteed';
  RAISE NOTICE '  ✅ updated_at cannot be NULL → Change tracking guaranteed';
  RAISE NOTICE '  ✅ status cannot be NULL → Business logic consistency';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
