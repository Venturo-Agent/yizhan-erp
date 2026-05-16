-- 修正河口湖、忍野八海、淺間神社的城市（安全：忽略 unique constraint 衝突）
DO $$
BEGIN
  UPDATE public.attractions
  SET city_id = (
    SELECT c.id
    FROM public.cities c
    JOIN public.countries co ON c.country_id = co.id
    WHERE co.name = '日本' AND c.name = '東京'
    LIMIT 1
  )
  WHERE name IN ('河口湖', '忍野八海', '淺間神社');
EXCEPTION WHEN unique_violation THEN
  -- 已存在同名景點，跳過
  NULL;
END $$;
