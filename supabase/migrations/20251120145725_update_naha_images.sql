-- 更新那霸的圖片為沖繩海灘圖片
BEGIN;

-- 先查詢目前的資料
-- SELECT id, name, background_image_url, background_image_url_2, primary_image FROM cities WHERE name = '那霸';

-- 更新為沖繩海灘的圖片
UPDATE cities
SET 
  background_image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80',  -- 沖繩美麗海灘
  background_image_url_2 = 'https://images.unsplash.com/photo-1590073844006-33379778ae09?w=1200&q=80',  -- 沖繩海岸線
  primary_image = 1,
  updated_at = now()
WHERE name = '那霸'
  AND country_id IN (SELECT id FROM countries WHERE name = '日本');

COMMIT;
