-- 為 cities 表新增 is_major 欄位
-- 用於標記主要城市（業務製作行程時選擇用）
-- 非主要城市則為子區域/景區（行程內標示用）

BEGIN;

-- 新增 is_major 欄位，預設為 false
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS is_major boolean DEFAULT false;

-- 新增 parent_city_id 欄位，用於連結子區域到主要城市（可選）
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS parent_city_id text REFERENCES public.cities(id);

-- 添加註解
COMMENT ON COLUMN public.cities.is_major IS '是否為主要城市（行程管理選擇用）';
COMMENT ON COLUMN public.cities.parent_city_id IS '父城市ID（子區域連結到主要城市）';

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_cities_is_major ON public.cities(is_major);
CREATE INDEX IF NOT EXISTS idx_cities_parent_city_id ON public.cities(parent_city_id);

COMMIT;
