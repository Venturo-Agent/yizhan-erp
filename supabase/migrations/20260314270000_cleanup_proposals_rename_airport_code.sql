-- Migration: 清理提案系統 + main_city_id -> airport_code

DROP TABLE IF EXISTS proposal_packages CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;

ALTER TABLE tours DROP COLUMN IF EXISTS proposal_id;
ALTER TABLE tours DROP COLUMN IF EXISTS proposal_package_id;
ALTER TABLE tours DROP COLUMN IF EXISTS converted_from_proposal;

-- main_city_id -> airport_code (tours)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tours' AND column_name='main_city_id') THEN
    ALTER TABLE tours DROP CONSTRAINT IF EXISTS tours_main_city_id_fkey;
    ALTER TABLE tours RENAME COLUMN main_city_id TO airport_code;
  END IF;
END $$;

-- main_city_id -> airport_code (quotes)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='main_city_id') THEN
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_main_city_id_fkey;
    ALTER TABLE quotes RENAME COLUMN main_city_id TO airport_code;
  END IF;
END $$;

ALTER TABLE itineraries DROP COLUMN IF EXISTS proposal_package_id;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tour_requests' AND table_schema='public') THEN
    ALTER TABLE tour_requests DROP COLUMN IF EXISTS proposal_package_id;
  END IF;
END $$;

-- Backfill airport_code
UPDATE tours SET airport_code = 'SGN' WHERE code = 'SGN260331A' AND airport_code IS NULL;
UPDATE tours SET airport_code = 'OKA' WHERE code = 'PROP-MMLMAU0H' AND airport_code IS NULL;
UPDATE tours SET airport_code = 'FUK' WHERE code = 'FUK260702A' AND airport_code IS NULL;
UPDATE tours SET airport_code = 'NGO' WHERE code = 'NGO260615A' AND airport_code IS NULL;
UPDATE tours SET airport_code = 'TW' WHERE code = 'TW260321A' AND airport_code IS NULL;
UPDATE tours SET airport_code = 'PVG' WHERE code = 'PVG260318A' AND airport_code IS NULL;
