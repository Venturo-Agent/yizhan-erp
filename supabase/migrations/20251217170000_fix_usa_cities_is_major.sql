-- 修正美國城市的 is_major 欄位
-- 讓行程管理可以選擇這些城市

BEGIN;

UPDATE public.cities
SET is_major = true
WHERE country_id = 'usa';

COMMIT;
