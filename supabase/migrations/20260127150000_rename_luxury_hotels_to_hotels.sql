-- 重命名 luxury_hotels 表為 hotels
-- 讓表名更簡潔直覺

-- 重命名表（僅在 hotels 不存在時）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='luxury_hotels' AND table_schema='public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='hotels' AND table_schema='public') THEN
    ALTER TABLE public.luxury_hotels RENAME TO hotels;
  END IF;
END $$;

-- 重命名索引（PostgreSQL 會自動處理大部分情況，但為了命名一致性還是改一下）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_luxury_hotels_country') AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hotels_country') THEN
    ALTER INDEX idx_luxury_hotels_country RENAME TO idx_hotels_country;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_luxury_hotels_city') AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hotels_city') THEN
    ALTER INDEX idx_luxury_hotels_city RENAME TO idx_hotels_city;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_luxury_hotels_brand') AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hotels_brand') THEN
    ALTER INDEX idx_luxury_hotels_brand RENAME TO idx_hotels_brand;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_luxury_hotels_active') AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hotels_active') THEN
    ALTER INDEX idx_luxury_hotels_active RENAME TO idx_hotels_active;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_luxury_hotels_star') AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hotels_star') THEN
    ALTER INDEX idx_luxury_hotels_star RENAME TO idx_hotels_star;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_luxury_hotels_class') AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hotels_class') THEN
    ALTER INDEX idx_luxury_hotels_class RENAME TO idx_hotels_class;
  END IF;
END $$;

-- 重命名觸發器函數
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_luxury_hotels_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_hotels_updated_at') THEN
    ALTER FUNCTION update_luxury_hotels_updated_at() RENAME TO update_hotels_updated_at;
  END IF;
END $$;

-- 重命名觸發器
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE t.tgname = 'trigger_luxury_hotels_updated_at' AND c.relname = 'hotels') THEN
    ALTER TRIGGER trigger_luxury_hotels_updated_at ON public.hotels RENAME TO trigger_hotels_updated_at;
  END IF;
END $$;

-- 更新註解
COMMENT ON TABLE public.hotels IS '飯店資料庫，用於行程規劃';
COMMENT ON COLUMN public.hotels.brand IS '飯店品牌，如：四季、麗思卡爾頓、安縵';
COMMENT ON COLUMN public.hotels.hotel_class IS 'luxury: 奢華, ultra-luxury: 頂級奢華, boutique: 精品';
COMMENT ON COLUMN public.hotels.category IS 'resort: 度假村, city: 城市飯店, onsen: 溫泉旅館';
