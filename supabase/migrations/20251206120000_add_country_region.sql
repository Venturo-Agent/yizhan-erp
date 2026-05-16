-- 為 countries 表新增 region 欄位
BEGIN;

ALTER TABLE public.countries
ADD COLUMN IF NOT EXISTS region text;

COMMENT ON COLUMN public.countries.region IS '地區分類：東亞、東南亞、中東、歐洲等';

COMMIT;
