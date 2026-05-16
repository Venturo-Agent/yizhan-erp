-- 刪除 itineraries 表的冗餘定價欄位
-- 原因：定價資料已移至 tours.selling_prices / tier_pricings

-- 1. 備份（以防需要回溯）
CREATE TABLE IF NOT EXISTS _backup_itineraries_pricing AS
SELECT 
  id, 
  price, 
  price_tiers, 
  pricing_details
FROM itineraries
WHERE price IS NOT NULL 
   OR price_tiers IS NOT NULL 
   OR pricing_details IS NOT NULL;

-- 2. 刪除冗餘欄位
ALTER TABLE itineraries
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS price_tiers,
  DROP COLUMN IF EXISTS pricing_details;

-- 註解
COMMENT ON TABLE _backup_itineraries_pricing IS 'Backup of pricing fields before deletion (2026-03-12). Data moved to tours.selling_prices / tier_pricings';

-- 驗證
DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM _backup_itineraries_pricing;
  RAISE NOTICE 'Backed up % itineraries with pricing data', backup_count;
END $$;
