-- 創建 tour_destinations 表格
-- 用於管理開團時的目的地選項（國家 + 城市 + 機場代碼）

BEGIN;

CREATE TABLE IF NOT EXISTS public.tour_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  city text NOT NULL,
  airport_code char(3) NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- 確保同一國家同一城市只有一筆記錄
  CONSTRAINT tour_destinations_unique_city UNIQUE (country, city),
  -- 確保機場代碼唯一
  CONSTRAINT tour_destinations_unique_airport_code UNIQUE (airport_code)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tour_destinations_country ON public.tour_destinations(country);
CREATE INDEX IF NOT EXISTS idx_tour_destinations_airport_code ON public.tour_destinations(airport_code);

-- 添加註解
COMMENT ON TABLE public.tour_destinations IS '旅遊團目的地管理表';
COMMENT ON COLUMN public.tour_destinations.country IS '國家名稱';
COMMENT ON COLUMN public.tour_destinations.city IS '城市名稱';
COMMENT ON COLUMN public.tour_destinations.airport_code IS 'IATA 機場代碼（3碼）';

-- 不啟用 RLS（這是全公司共用的基礎資料）
ALTER TABLE public.tour_destinations DISABLE ROW LEVEL SECURITY;

-- 插入常用的目的地（泰國、日本、韓國等熱門旅遊地）
INSERT INTO public.tour_destinations (country, city, airport_code) VALUES
  -- 泰國
  ('泰國', '清邁', 'CNX'),
  ('泰國', '曼谷', 'BKK'),
  ('泰國', '普吉島', 'HKT'),
  ('泰國', '清萊', 'CEI'),
  ('泰國', '蘇美島', 'USM'),
  -- 日本
  ('日本', '東京', 'NRT'),
  ('日本', '大阪', 'KIX'),
  ('日本', '名古屋', 'NGO'),
  ('日本', '福岡', 'FUK'),
  ('日本', '札幌', 'CTS'),
  ('日本', '沖繩', 'OKA'),
  -- 韓國
  ('韓國', '首爾', 'ICN'),
  ('韓國', '釜山', 'PUS'),
  ('韓國', '濟州島', 'CJU'),
  -- 越南
  ('越南', '河內', 'HAN'),
  ('越南', '胡志明市', 'SGN'),
  ('越南', '峴港', 'DAD'),
  -- 新加坡
  ('新加坡', '新加坡', 'SIN'),
  -- 馬來西亞
  ('馬來西亞', '吉隆坡', 'KUL'),
  ('馬來西亞', '檳城', 'PEN'),
  -- 印尼
  ('印尼', '峇里島', 'DPS'),
  ('印尼', '雅加達', 'CGK'),
  -- 中國
  ('中國', '上海', 'PVG'),
  ('中國', '北京', 'PEK'),
  ('中國', '廣州', 'CAN'),
  ('中國', '深圳', 'SZX'),
  ('中國', '成都', 'CTU'),
  ('中國', '杭州', 'HGH'),
  -- 香港/澳門
  ('香港', '香港', 'HKG'),
  ('澳門', '澳門', 'MFM'),
  -- 歐洲
  ('法國', '巴黎', 'CDG'),
  ('英國', '倫敦', 'LHR'),
  ('義大利', '羅馬', 'FCO'),
  ('德國', '法蘭克福', 'FRA'),
  ('西班牙', '巴塞隆納', 'BCN'),
  -- 美洲
  ('美國', '洛杉磯', 'LAX'),
  ('美國', '紐約', 'JFK'),
  ('美國', '舊金山', 'SFO'),
  ('加拿大', '溫哥華', 'YVR'),
  -- 澳洲
  ('澳洲', '雪梨', 'SYD'),
  ('澳洲', '墨爾本', 'MEL'),
  -- 紐西蘭
  ('紐西蘭', '奧克蘭', 'AKL')
ON CONFLICT DO NOTHING;

COMMIT;
