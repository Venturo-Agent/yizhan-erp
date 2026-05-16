-- 為 attractions 表新增 type 欄位，用於分類景點類型
BEGIN;

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS type text DEFAULT 'attraction';

COMMENT ON COLUMN public.attractions.type IS '景點類型：attraction(景點)、museum(博物館)、temple(寺廟)、park(公園)、shopping(購物)、food(美食)、beach(海灘)、theme_park(主題樂園)、viewpoint(觀景台)、landmark(地標)、market(市場)、garden(花園)、heritage(古蹟)';

COMMIT;
