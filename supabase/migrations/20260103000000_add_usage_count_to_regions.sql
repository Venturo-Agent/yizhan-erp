-- 為國家和城市加上使用次數追蹤，讓常用的排在前面
BEGIN;

-- 國家加上 usage_count
ALTER TABLE countries ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

-- 城市加上 usage_count
ALTER TABLE cities ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

-- 建立索引加速排序
CREATE INDEX IF NOT EXISTS idx_countries_usage_count ON countries(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_cities_usage_count ON cities(usage_count DESC);

COMMENT ON COLUMN countries.usage_count IS '使用次數，用於排序常用國家到最前面';
COMMENT ON COLUMN cities.usage_count IS '使用次數，用於排序常用城市到最前面';

COMMIT;
