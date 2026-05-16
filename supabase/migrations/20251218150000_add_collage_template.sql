-- =====================================================
-- 新增 Collage 互動拼貼模板
-- Pop Art 風格、拍立得圖片、登機證卡片
-- =====================================================

BEGIN;

-- 新增封面模板
INSERT INTO "public"."cover_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('collage', '互動拼貼', 'Pop Art 風格、拍立得圖片、手寫字體、登機證卡片', 'TourHeroCollage', 8)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

-- 新增航班模板
INSERT INTO "public"."flight_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('collage', '互動拼貼', '登機證風格、Pop Art 配色、膠帶裝飾', 'TourFlightSectionCollage', 8)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

COMMIT;
