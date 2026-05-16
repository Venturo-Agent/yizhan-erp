-- 整合 tour_destinations 到 ref_airports
-- Migration: 20260131_add_airport_favorite

-- Step 1: 新增欄位
ALTER TABLE ref_airports ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE ref_airports ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Step 2: 標記現有常用機場為 favorite
UPDATE ref_airports SET is_favorite = true WHERE iata_code IN (
  'KMQ',  -- 金澤/小松
  'KIX',  -- 大阪/關西
  'HKG',  -- 香港
  'NRT',  -- 東京/成田
  'FUK',  -- 福岡
  'SFO',  -- 舊金山
  'DAD',  -- 峴港
  'PUS',  -- 釜山
  'HRB',  -- 哈爾濱
  'HND',  -- 東京/羽田
  'XMN'   -- 廈門
);

-- Step 3: 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_ref_airports_favorite ON ref_airports(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_ref_airports_country ON ref_airports(country_code);

-- Step 4: 驗證
SELECT iata_code, name_zh, city_name_zh, country_code, is_favorite 
FROM ref_airports 
WHERE is_favorite = true
ORDER BY country_code, city_name_zh;
