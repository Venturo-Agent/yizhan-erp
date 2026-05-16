-- =====================================================
-- 新增 Dreamscape 夢幻漫遊模板
-- Blob 遮罩、玻璃擬態、浮動動畫
-- =====================================================

BEGIN;

-- 新增封面模板
INSERT INTO "public"."cover_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('dreamscape', '夢幻漫遊', 'Blob 遮罩、玻璃擬態卡片、浮動動畫、夢幻漸層', 'TourHeroDreamscape', 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

-- 新增航班模板
INSERT INTO "public"."flight_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('dreamscape', '夢幻漫遊', '節點路徑圖、玻璃卡片設計、浮動動畫', 'TourFlightSectionDreamscape', 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

COMMIT;
