-- Pre-Migration Cleanup: Fix Orphan Records

-- Fix payment_request_items orphan records
DO $$
DECLARE
  fixed_count INT;
BEGIN
  UPDATE payment_request_items
  SET supplier_id = NULL
  WHERE supplier_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM suppliers s WHERE s.id = supplier_id
    );
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % orphan records in payment_request_items', fixed_count;
END $$;

-- Check other potential orphans (informational)
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM payment_requests pr
  WHERE pr.supplier_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = pr.supplier_id);
  IF orphan_count > 0 THEN
    RAISE NOTICE 'payment_requests.supplier_id: % orphans', orphan_count;
  END IF;
END $$;
