-- 更新那霸的圖片（修正版）
BEGIN;

-- 更新為那霸/沖繩特色景點圖片
UPDATE cities
SET
  background_image_url = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80',  -- 首里城（沖繩代表性建築）
  background_image_url_2 = 'https://images.unsplash.com/photo-1570641963303-92ce4845ed4c?w=1200&q=80',  -- 沖繩海灘美景
  primary_image = 1,
  updated_at = now()
WHERE name = '那霸'
  AND country_id IN (SELECT id FROM countries WHERE name = '日本');

COMMIT;
