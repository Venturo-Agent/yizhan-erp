-- 更新那霸圖片為真正的沖繩景點
BEGIN;

UPDATE cities
SET
  -- 圖片 1: 沖繩美麗海水族館/海灘
  background_image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80',
  -- 圖片 2: 首里城
  background_image_url_2 = 'https://images.unsplash.com/photo-1624253321033-c4eb104e7462?w=1200&q=80',
  primary_image = 1,
  updated_at = now()
WHERE name = '那霸'
  AND country_id IN (SELECT id FROM countries WHERE name = '日本');

COMMIT;
