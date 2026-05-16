-- =====================================================
-- 新增 Dreamscape 和 Collage 每日行程模板
-- =====================================================

BEGIN;

-- 新增 Dreamscape 每日行程模板
INSERT INTO "public"."daily_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
    ('dreamscape', '夢幻漫遊', 'Blob 遮罩、全幅英雄圖、玻璃卡片、浮動動畫', 'TourItinerarySectionDreamscape', 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    component_name = EXCLUDED.component_name,
    sort_order = EXCLUDED.sort_order;

-- 新增 Collage 每日行程模板（未來實作）
-- INSERT INTO "public"."daily_templates" ("id", "name", "description", "component_name", "sort_order") VALUES
--     ('collage', '互動拼貼', '拍立得照片、便條紙、膠帶裝飾、手寫字體', 'TourItinerarySectionCollage', 8)
-- ON CONFLICT (id) DO UPDATE SET
--     name = EXCLUDED.name,
--     description = EXCLUDED.description,
--     component_name = EXCLUDED.component_name,
--     sort_order = EXCLUDED.sort_order;

COMMIT;
