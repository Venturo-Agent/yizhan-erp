-- 新增各區塊獨立模板系統
-- 讓每個區塊都能獨立選擇模板風格

BEGIN;

-- ============================================
-- 1. 建立領隊模板資料表
-- ============================================
CREATE TABLE IF NOT EXISTS public.leader_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  preview_image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 插入領隊模板
INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('original', '經典風格', '簡潔的領隊資訊呈現', 1),
  ('luxury', '奢華質感', '精緻的領隊介紹卡片', 2),
  ('minimal', '極簡風格', '只顯示必要資訊', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 建立飯店模板資料表
-- ============================================
CREATE TABLE IF NOT EXISTS public.hotel_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  preview_image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 插入飯店模板
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('original', '經典風格', '標準飯店資訊列表', 1),
  ('luxury', '奢華質感', '精緻飯店卡片展示', 2),
  ('gallery', '圖庫模式', '以圖片為主的展示', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. 建立價格模板資料表
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  preview_image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 插入價格模板
INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('original', '經典風格', '標準價格表格', 1),
  ('luxury', '奢華質感', '精緻價格卡片', 2),
  ('tiers', '階層式', '多層級價格展示', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. 建立特色模板資料表
-- ============================================
CREATE TABLE IF NOT EXISTS public.features_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  preview_image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 插入特色模板
INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('original', '經典風格', '標準特色列表', 1),
  ('luxury', '奢華質感', '精緻特色卡片', 2),
  ('icons', '圖示模式', '以圖示為主的展示', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. 為 itineraries 新增各區塊風格欄位
-- ============================================
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS leader_style text DEFAULT 'original',
ADD COLUMN IF NOT EXISTS hotel_style text DEFAULT 'original',
ADD COLUMN IF NOT EXISTS pricing_style text DEFAULT 'original',
ADD COLUMN IF NOT EXISTS features_style text DEFAULT 'original';

-- 添加欄位註解
COMMENT ON COLUMN public.itineraries.leader_style IS '領隊區塊模板風格';
COMMENT ON COLUMN public.itineraries.hotel_style IS '飯店區塊模板風格';
COMMENT ON COLUMN public.itineraries.pricing_style IS '價格區塊模板風格';
COMMENT ON COLUMN public.itineraries.features_style IS '特色區塊模板風格';

-- 添加表格註解
COMMENT ON TABLE public.leader_templates IS '領隊資訊區塊模板';
COMMENT ON TABLE public.hotel_templates IS '飯店資訊區塊模板';
COMMENT ON TABLE public.pricing_templates IS '價格資訊區塊模板';
COMMENT ON TABLE public.features_templates IS '特色資訊區塊模板';

COMMIT;
