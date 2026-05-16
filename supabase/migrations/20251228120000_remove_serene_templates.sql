-- 移除 Serene (浮水印風) 風格模板
-- 這個風格已被移除，不再使用

BEGIN;

-- 從 cover_templates 刪除 serene
DELETE FROM public.cover_templates WHERE id = 'serene';

-- 從 hotel_templates 刪除 serene
DELETE FROM public.hotel_templates WHERE id = 'serene';

-- 從 features_templates 刪除 serene
DELETE FROM public.features_templates WHERE id = 'serene';

-- 從 leader_templates 刪除 serene
DELETE FROM public.leader_templates WHERE id = 'serene';

-- 從 pricing_templates 刪除 serene
DELETE FROM public.pricing_templates WHERE id = 'serene';

COMMIT;
