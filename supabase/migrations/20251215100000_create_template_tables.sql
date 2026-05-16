-- =====================================================
-- 模板系統資料庫遷移
-- 建立封面模板和每日行程模板定義表
-- =====================================================

BEGIN;

-- =====================================================
-- 1. 建立封面模板定義表
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."cover_templates" (
    "id" TEXT PRIMARY KEY,                       -- 模板的唯一ID，例如 'original', 'luxury'
    "name" TEXT NOT NULL,                        -- 顯示給使用者看的名稱
    "description" TEXT,                          -- 模板的簡短描述
    "preview_image_url" TEXT,                    -- 預覽圖的URL
    "component_name" TEXT NOT NULL UNIQUE,       -- 對應的前端React元件名稱
    "sort_order" INTEGER DEFAULT 0,              -- 排序順序
    "is_active" BOOLEAN DEFAULT true,            -- 是否啟用
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS "cover_templates_sort_order_idx" ON "public"."cover_templates" ("sort_order");
CREATE INDEX IF NOT EXISTS "cover_templates_is_active_idx" ON "public"."cover_templates" ("is_active");

-- 加入註解
COMMENT ON TABLE "public"."cover_templates" IS '封面模板定義表';
COMMENT ON COLUMN "public"."cover_templates"."id" IS '模板唯一識別碼';
COMMENT ON COLUMN "public"."cover_templates"."component_name" IS '對應的 React 元件名稱';

-- =====================================================
-- 2. 建立每日行程模板定義表
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."daily_templates" (
    "id" TEXT PRIMARY KEY,                       -- 模板的唯一ID，例如 'original', 'luxury'
    "name" TEXT NOT NULL,                        -- 顯示給使用者看的名稱
    "description" TEXT,                          -- 模板的簡短描述
    "preview_image_url" TEXT,                    -- 預覽圖的URL
    "component_name" TEXT NOT NULL UNIQUE,       -- 對應的前端React元件名稱
    "sort_order" INTEGER DEFAULT 0,              -- 排序順序
    "is_active" BOOLEAN DEFAULT true,            -- 是否啟用
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS "daily_templates_sort_order_idx" ON "public"."daily_templates" ("sort_order");
CREATE INDEX IF NOT EXISTS "daily_templates_is_active_idx" ON "public"."daily_templates" ("is_active");

-- 加入註解
COMMENT ON TABLE "public"."daily_templates" IS '每日行程模板定義表';
COMMENT ON COLUMN "public"."daily_templates"."component_name" IS '對應的 React 元件名稱';

-- =====================================================
-- 3. 建立航班卡片模板定義表（補充）
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."flight_templates" (
    "id" TEXT PRIMARY KEY,                       -- 模板的唯一ID
    "name" TEXT NOT NULL,                        -- 顯示給使用者看的名稱
    "description" TEXT,                          -- 模板的簡短描述
    "preview_image_url" TEXT,                    -- 預覽圖的URL
    "component_name" TEXT NOT NULL UNIQUE,       -- 對應的前端React元件名稱
    "sort_order" INTEGER DEFAULT 0,              -- 排序順序
    "is_active" BOOLEAN DEFAULT true,            -- 是否啟用
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS "flight_templates_sort_order_idx" ON "public"."flight_templates" ("sort_order");
CREATE INDEX IF NOT EXISTS "flight_templates_is_active_idx" ON "public"."flight_templates" ("is_active");

COMMENT ON TABLE "public"."flight_templates" IS '航班卡片模板定義表';

-- =====================================================
-- 4. 插入現有模板資料（封面模板）
-- =====================================================
INSERT INTO "public"."cover_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('original', '經典全屏', '全螢幕背景圖片，文字置中，金色漸層動畫', 'TourHeroSection', 1),
    ('gemini', 'Gemini 風格', '精緻小巧，底部文字佈局，莫蘭迪金色', 'TourHeroGemini', 2),
    ('nature', '日式和風', '日式極簡風，垂直文字，和紙紋理背景', 'TourHeroNature', 3),
    ('serene', '浮水印風', '藍色寧靜風，大型日期浮水印，優雅字體', 'TourHeroSerene', 4),
    ('luxury', '奢華質感', '左右分欄佈局，襯線字體，深綠金色系', 'TourHeroLuxury', 5),
    ('art', '藝術雜誌', '全螢幕大圖，高對比排版，雜誌感設計', 'TourHeroArt', 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

-- =====================================================
-- 5. 插入現有模板資料（每日行程模板）
-- =====================================================
INSERT INTO "public"."daily_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('original', '經典時間軸', '傳統時間軸風格，清晰的行程安排', 'TourItinerarySection', 1),
    ('luxury', '奢華質感', '卡片式佈局，深色調，精緻排版', 'TourItinerarySectionLuxury', 2),
    ('art', '藝術雜誌', '12欄網格系統，垂直導航，Brutalist 設計', 'TourItinerarySectionArt', 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

-- =====================================================
-- 6. 插入現有模板資料（航班卡片模板）
-- =====================================================
INSERT INTO "public"."flight_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('original', '經典金色', '莫蘭迪金色風格，簡潔優雅', 'FlightCardOriginal', 1),
    ('chinese', '中國風', '書法水墨風格，傳統美學', 'FlightCardChinese', 2),
    ('japanese', '日式和風', '和紙風格，搭配目的地圖片', 'FlightCardJapanese', 3),
    ('luxury', '奢華質感', '表格式深色調，商務感', 'FlightCardLuxury', 4),
    ('art', '藝術雜誌', 'Brutalist 高對比，現代感', 'FlightCardArt', 5),
    ('none', '國內無航班', '台灣行程專用，不顯示航班', 'FlightCardNone', 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

-- =====================================================
-- 7. 為 itineraries 表新增模板關聯欄位
-- （注意：現有的 cover_style, flight_style, itinerary_style 欄位保留向後相容）
-- =====================================================
ALTER TABLE "public"."itineraries"
ADD COLUMN IF NOT EXISTS "cover_template_id" TEXT,
ADD COLUMN IF NOT EXISTS "daily_template_id" TEXT,
ADD COLUMN IF NOT EXISTS "flight_template_id" TEXT;

-- 建立外鍵關聯（ON DELETE SET NULL 確保刪除模板不會影響現有行程）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'itineraries_cover_template_id_fkey'
    ) THEN
        ALTER TABLE "public"."itineraries"
        ADD CONSTRAINT "itineraries_cover_template_id_fkey"
        FOREIGN KEY ("cover_template_id") REFERENCES "public"."cover_templates"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'itineraries_daily_template_id_fkey'
    ) THEN
        ALTER TABLE "public"."itineraries"
        ADD CONSTRAINT "itineraries_daily_template_id_fkey"
        FOREIGN KEY ("daily_template_id") REFERENCES "public"."daily_templates"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'itineraries_flight_template_id_fkey'
    ) THEN
        ALTER TABLE "public"."itineraries"
        ADD CONSTRAINT "itineraries_flight_template_id_fkey"
        FOREIGN KEY ("flight_template_id") REFERENCES "public"."flight_templates"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS "itineraries_cover_template_id_idx" ON "public"."itineraries" ("cover_template_id");
CREATE INDEX IF NOT EXISTS "itineraries_daily_template_id_idx" ON "public"."itineraries" ("daily_template_id");
CREATE INDEX IF NOT EXISTS "itineraries_flight_template_id_idx" ON "public"."itineraries" ("flight_template_id");

-- =====================================================
-- 8. 資料遷移：將現有樣式轉換為模板 ID
-- =====================================================
-- 將現有的 cover_style 值複製到 cover_template_id
UPDATE "public"."itineraries"
SET "cover_template_id" = "cover_style"
WHERE "cover_style" IS NOT NULL AND "cover_template_id" IS NULL;

-- 將現有的 itinerary_style 值複製到 daily_template_id
UPDATE "public"."itineraries"
SET "daily_template_id" = "itinerary_style"
WHERE "itinerary_style" IS NOT NULL AND "daily_template_id" IS NULL;

-- 將現有的 flight_style 值複製到 flight_template_id
UPDATE "public"."itineraries"
SET "flight_template_id" = "flight_style"
WHERE "flight_style" IS NOT NULL AND "flight_template_id" IS NULL;

-- =====================================================
-- 9. 禁用 RLS（模板表為全域資料，不需要 workspace 隔離）
-- =====================================================
ALTER TABLE "public"."cover_templates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."daily_templates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."flight_templates" DISABLE ROW LEVEL SECURITY;

COMMIT;
