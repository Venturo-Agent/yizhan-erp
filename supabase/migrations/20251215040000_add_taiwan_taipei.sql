-- 新增台灣作為目的地國家，台北等城市
BEGIN;

-- 新增台灣國家（使用固定 UUID，方便後續引用）
INSERT INTO public.countries (id, name, name_en, code, emoji, region, is_active, display_order)
SELECT
  'taiwan-country-001',
  '台灣',
  'Taiwan',
  'TW',
  '🇹🇼',
  '東亞',
  true,
  10
WHERE NOT EXISTS (
  SELECT 1 FROM public.countries WHERE name = '台灣' OR code = 'TW'
);

-- 新增台北
INSERT INTO public.cities (id, name, name_en, country_id, airport_code, is_active, is_major, display_order)
SELECT gen_random_uuid()::text, '台北', 'Taipei', c.id, 'TPE', true, true, 1
FROM public.countries c
WHERE (c.name = '台灣' OR c.code = 'TW')
AND NOT EXISTS (
  SELECT 1 FROM public.cities WHERE name = '台北' AND country_id = c.id
);

-- 新增台中
INSERT INTO public.cities (id, name, name_en, country_id, airport_code, is_active, is_major, display_order)
SELECT gen_random_uuid()::text, '台中', 'Taichung', c.id, 'TXG', true, true, 2
FROM public.countries c
WHERE (c.name = '台灣' OR c.code = 'TW')
AND NOT EXISTS (
  SELECT 1 FROM public.cities WHERE name = '台中' AND country_id = c.id
);

-- 新增高雄
INSERT INTO public.cities (id, name, name_en, country_id, airport_code, is_active, is_major, display_order)
SELECT gen_random_uuid()::text, '高雄', 'Kaohsiung', c.id, 'KHH', true, true, 3
FROM public.countries c
WHERE (c.name = '台灣' OR c.code = 'TW')
AND NOT EXISTS (
  SELECT 1 FROM public.cities WHERE name = '高雄' AND country_id = c.id
);

-- 新增花蓮
INSERT INTO public.cities (id, name, name_en, country_id, airport_code, is_active, is_major, display_order)
SELECT gen_random_uuid()::text, '花蓮', 'Hualien', c.id, 'HUN', true, false, 4
FROM public.countries c
WHERE (c.name = '台灣' OR c.code = 'TW')
AND NOT EXISTS (
  SELECT 1 FROM public.cities WHERE name = '花蓮' AND country_id = c.id
);

-- 新增台東
INSERT INTO public.cities (id, name, name_en, country_id, airport_code, is_active, is_major, display_order)
SELECT gen_random_uuid()::text, '台東', 'Taitung', c.id, 'TTT', true, false, 5
FROM public.countries c
WHERE (c.name = '台灣' OR c.code = 'TW')
AND NOT EXISTS (
  SELECT 1 FROM public.cities WHERE name = '台東' AND country_id = c.id
);

COMMIT;
