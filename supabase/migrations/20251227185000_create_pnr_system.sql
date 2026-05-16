-- ============================================
-- PNR 管理系統 - 資料庫結構
-- ============================================
-- 日期: 2025-12-27
-- 用途: 儲存和管理 Amadeus PNR 記錄
-- 功能: 追蹤開票期限、航班資訊、旅客資料

-- ============================================
-- Part 1: 參考資料表
-- ============================================

-- 1.1 航空公司代碼
CREATE TABLE IF NOT EXISTS public.ref_airlines (
  iata_code varchar(3) PRIMARY KEY,
  icao_code varchar(4),
  name_en varchar(100),
  name_zh varchar(100),
  country varchar(50),
  alliance varchar(20),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ref_airlines IS '航空公司代碼對照表';

-- 1.2 機場代碼
CREATE TABLE IF NOT EXISTS public.ref_airports (
  iata_code varchar(3) PRIMARY KEY,
  icao_code varchar(4),
  name_en varchar(200),
  name_zh varchar(200),
  city_code varchar(3),
  city_name_en varchar(100),
  city_name_zh varchar(100),
  country_code varchar(2),
  timezone varchar(50),
  latitude decimal(10, 6),
  longitude decimal(10, 6),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ref_airports IS '機場代碼對照表';

-- 1.3 艙等代碼
CREATE TABLE IF NOT EXISTS public.ref_booking_classes (
  code varchar(2) PRIMARY KEY,
  cabin_type varchar(20),
  description varchar(100),
  priority integer,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ref_booking_classes IS '艙等代碼對照表';

-- 1.4 SSR 代碼
CREATE TABLE IF NOT EXISTS public.ref_ssr_codes (
  code varchar(4) PRIMARY KEY,
  category varchar(20),
  description_en varchar(200),
  description_zh varchar(200),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ref_ssr_codes IS 'SSR 特殊服務代碼對照表';

-- 1.5 狀態碼
CREATE TABLE IF NOT EXISTS public.ref_status_codes (
  code varchar(3) PRIMARY KEY,
  category varchar(20),
  description_en varchar(200),
  description_zh varchar(200),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ref_status_codes IS 'PNR 狀態碼對照表';

-- ============================================
-- Part 2: PNR 核心表格
-- ============================================

-- 2.1 PNR 記錄主表
CREATE TABLE IF NOT EXISTS public.pnr_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_locator varchar(6) NOT NULL,
  raw_content text,
  office_id varchar(20),
  created_date date,
  ticketing_status varchar(10),
  ticketing_deadline timestamptz,
  is_ticketed boolean DEFAULT false,
  ticket_numbers text[],
  tour_id text,  -- tours.id 是 text 類型
  notes text,
  workspace_id uuid REFERENCES public.workspaces(id),
  created_by uuid REFERENCES public.employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_records IS 'PNR 記錄主表';
COMMENT ON COLUMN public.pnr_records.record_locator IS 'PNR 代碼（6 碼）';
COMMENT ON COLUMN public.pnr_records.ticketing_status IS 'TKOK/TKTL/TKXL/TKNE';
COMMENT ON COLUMN public.pnr_records.ticketing_deadline IS '開票期限';

-- 2.2 PNR 旅客
CREATE TABLE IF NOT EXISTS public.pnr_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  sequence_number integer,
  surname varchar(100) NOT NULL,
  given_name varchar(100),
  title varchar(10),
  passenger_type varchar(10) DEFAULT 'ADT',
  date_of_birth date,
  customer_id text,  -- customers.id 是 text 類型
  order_member_id uuid,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_passengers IS 'PNR 旅客資料';
COMMENT ON COLUMN public.pnr_passengers.passenger_type IS 'ADT=成人, CHD=兒童, INF=嬰兒, INS=嬰兒佔位';

-- 2.3 PNR 航班段
CREATE TABLE IF NOT EXISTS public.pnr_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  segment_number integer,
  airline_code varchar(3) NOT NULL,
  flight_number varchar(6) NOT NULL,
  booking_class varchar(2),
  departure_date date NOT NULL,
  day_of_week integer,
  origin varchar(3) NOT NULL,
  destination varchar(3) NOT NULL,
  status_code varchar(3),
  quantity integer DEFAULT 1,
  departure_time time,
  arrival_time time,
  arrival_day_offset integer DEFAULT 0,
  equipment varchar(10),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_segments IS 'PNR 航班段';
COMMENT ON COLUMN public.pnr_segments.arrival_day_offset IS '0=當日, 1=隔日抵達';

-- 2.4 PNR SSR 特殊服務
CREATE TABLE IF NOT EXISTS public.pnr_ssr_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  passenger_id uuid REFERENCES public.pnr_passengers(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES public.pnr_segments(id) ON DELETE SET NULL,
  ssr_code varchar(4) NOT NULL,
  airline_code varchar(3),
  status varchar(3),
  free_text text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_ssr_elements IS 'PNR 特殊服務請求';

-- 2.5 PNR 備註
CREATE TABLE IF NOT EXISTS public.pnr_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  remark_type varchar(10),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_remarks IS 'PNR 備註';
COMMENT ON COLUMN public.pnr_remarks.remark_type IS 'RM=一般, RC=機密, RI=發票';

-- ============================================
-- Part 3: 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pnr_records_locator ON public.pnr_records(record_locator);
CREATE INDEX IF NOT EXISTS idx_pnr_records_deadline ON public.pnr_records(ticketing_deadline) WHERE ticketing_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pnr_records_tour ON public.pnr_records(tour_id) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pnr_records_workspace ON public.pnr_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pnr_passengers_pnr ON public.pnr_passengers(pnr_id);
CREATE INDEX IF NOT EXISTS idx_pnr_passengers_customer ON public.pnr_passengers(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pnr_segments_pnr ON public.pnr_segments(pnr_id);
CREATE INDEX IF NOT EXISTS idx_pnr_segments_date ON public.pnr_segments(departure_date);

-- ============================================
-- Part 4: RLS Policies
-- ============================================

-- 參考資料表不啟用 RLS（全公司共用）
ALTER TABLE public.ref_airlines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_airports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_booking_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_ssr_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_status_codes DISABLE ROW LEVEL SECURITY;

-- PNR 核心表格啟用 RLS
ALTER TABLE public.pnr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnr_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnr_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnr_ssr_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnr_remarks ENABLE ROW LEVEL SECURITY;

-- pnr_records policies
DROP POLICY IF EXISTS "pnr_records_select" ON public.pnr_records;
CREATE POLICY "pnr_records_select" ON public.pnr_records FOR SELECT
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pnr_records_insert" ON public.pnr_records;
CREATE POLICY "pnr_records_insert" ON public.pnr_records FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pnr_records_update" ON public.pnr_records;
CREATE POLICY "pnr_records_update" ON public.pnr_records FOR UPDATE
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pnr_records_delete" ON public.pnr_records;
CREATE POLICY "pnr_records_delete" ON public.pnr_records FOR DELETE
USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 子表格透過 pnr_id 關聯，使用簡單的 policies
DROP POLICY IF EXISTS "pnr_passengers_all" ON public.pnr_passengers;
CREATE POLICY "pnr_passengers_all" ON public.pnr_passengers FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pnr_segments_all" ON public.pnr_segments;
CREATE POLICY "pnr_segments_all" ON public.pnr_segments FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pnr_ssr_elements_all" ON public.pnr_ssr_elements;
CREATE POLICY "pnr_ssr_elements_all" ON public.pnr_ssr_elements FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pnr_remarks_all" ON public.pnr_remarks;
CREATE POLICY "pnr_remarks_all" ON public.pnr_remarks FOR ALL
USING (true) WITH CHECK (true);

-- ============================================
-- Part 5: 初始資料 - 航空公司
-- ============================================

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ref_airlines' AND column_name='name_en') THEN

INSERT INTO public.ref_airlines (iata_code, icao_code, name_en, name_zh, country, alliance) VALUES
-- 台灣
('CI', 'CAL', 'China Airlines', '中華航空', 'Taiwan', 'SkyTeam'),
('BR', 'EVA', 'EVA Air', '長榮航空', 'Taiwan', 'Star Alliance'),
('AE', 'MDA', 'Mandarin Airlines', '華信航空', 'Taiwan', NULL),
('B7', 'UIA', 'UNI Air', '立榮航空', 'Taiwan', NULL),
('IT', 'TTW', 'Tigerair Taiwan', '台灣虎航', 'Taiwan', NULL),
('JX', 'SRX', 'Starlux Airlines', '星宇航空', 'Taiwan', NULL),
-- 香港/澳門
('CX', 'CPA', 'Cathay Pacific', '國泰航空', 'Hong Kong', 'OneWorld'),
('HX', 'CRK', 'Hong Kong Airlines', '香港航空', 'Hong Kong', NULL),
('NX', 'AMU', 'Air Macau', '澳門航空', 'Macau', NULL),
-- 日本
('JL', 'JAL', 'Japan Airlines', '日本航空', 'Japan', 'OneWorld'),
('NH', 'ANA', 'All Nippon Airways', '全日空', 'Japan', 'Star Alliance'),
('MM', 'APJ', 'Peach Aviation', '樂桃航空', 'Japan', NULL),
('BC', 'SKY', 'Skymark Airlines', '天馬航空', 'Japan', NULL),
('HD', 'ADO', 'Air Do', '北海道國際航空', 'Japan', NULL),
('NU', 'JTA', 'Japan Transocean Air', '日本越洋航空', 'Japan', NULL),
('GK', 'JJP', 'Jetstar Japan', '捷星日本', 'Japan', NULL),
-- 韓國
('KE', 'KAL', 'Korean Air', '大韓航空', 'Korea', 'SkyTeam'),
('OZ', 'AAR', 'Asiana Airlines', '韓亞航空', 'Korea', 'Star Alliance'),
('7C', 'JJA', 'Jeju Air', '濟州航空', 'Korea', NULL),
('TW', 'TWB', 'T''way Air', '德威航空', 'Korea', NULL),
('LJ', 'JNA', 'Jin Air', '真航空', 'Korea', NULL),
-- 東南亞
('SQ', 'SIA', 'Singapore Airlines', '新加坡航空', 'Singapore', 'Star Alliance'),
('TR', 'TGW', 'Scoot', '酷航', 'Singapore', NULL),
('TG', 'THA', 'Thai Airways', '泰國航空', 'Thailand', 'Star Alliance'),
('FD', 'AIQ', 'Thai AirAsia', '泰國亞航', 'Thailand', NULL),
('VZ', 'TVJ', 'Thai Vietjet Air', '泰越捷', 'Thailand', NULL),
('VN', 'HVN', 'Vietnam Airlines', '越南航空', 'Vietnam', 'SkyTeam'),
('VJ', 'VJC', 'Vietjet Air', '越捷航空', 'Vietnam', NULL),
('MH', 'MAS', 'Malaysia Airlines', '馬來西亞航空', 'Malaysia', 'OneWorld'),
('AK', 'AXM', 'AirAsia', '亞洲航空', 'Malaysia', NULL),
('PR', 'PAL', 'Philippine Airlines', '菲律賓航空', 'Philippines', NULL),
('5J', 'CEB', 'Cebu Pacific', '宿霧太平洋', 'Philippines', NULL),
('GA', 'GIA', 'Garuda Indonesia', '印尼航空', 'Indonesia', 'SkyTeam'),
-- 中國大陸
('CA', 'CCA', 'Air China', '中國國際航空', 'China', 'Star Alliance'),
('MU', 'CES', 'China Eastern', '中國東方航空', 'China', 'SkyTeam'),
('CZ', 'CSN', 'China Southern', '中國南方航空', 'China', 'SkyTeam'),
('HU', 'CHH', 'Hainan Airlines', '海南航空', 'China', NULL),
('3U', 'CSC', 'Sichuan Airlines', '四川航空', 'China', NULL),
('SC', 'CDG', 'Shandong Airlines', '山東航空', 'China', NULL),
('ZH', 'CSZ', 'Shenzhen Airlines', '深圳航空', 'China', 'Star Alliance'),
('FM', 'CSH', 'Shanghai Airlines', '上海航空', 'China', 'SkyTeam'),
('MF', 'CXA', 'Xiamen Airlines', '廈門航空', 'China', 'SkyTeam'),
-- 歐洲
('LH', 'DLH', 'Lufthansa', '漢莎航空', 'Germany', 'Star Alliance'),
('BA', 'BAW', 'British Airways', '英國航空', 'UK', 'OneWorld'),
('AF', 'AFR', 'Air France', '法國航空', 'France', 'SkyTeam'),
('KL', 'KLM', 'KLM Royal Dutch', '荷蘭皇家航空', 'Netherlands', 'SkyTeam'),
('LX', 'SWR', 'Swiss International', '瑞士航空', 'Switzerland', 'Star Alliance'),
('OS', 'AUA', 'Austrian Airlines', '奧地利航空', 'Austria', 'Star Alliance'),
('TK', 'THY', 'Turkish Airlines', '土耳其航空', 'Turkey', 'Star Alliance'),
('EK', 'UAE', 'Emirates', '阿聯酋航空', 'UAE', NULL),
('EY', 'ETD', 'Etihad Airways', '阿提哈德航空', 'UAE', NULL),
('QR', 'QTR', 'Qatar Airways', '卡達航空', 'Qatar', 'OneWorld'),
-- 美洲
('AA', 'AAL', 'American Airlines', '美國航空', 'USA', 'OneWorld'),
('UA', 'UAL', 'United Airlines', '聯合航空', 'USA', 'Star Alliance'),
('DL', 'DAL', 'Delta Air Lines', '達美航空', 'USA', 'SkyTeam'),
('AC', 'ACA', 'Air Canada', '加拿大航空', 'Canada', 'Star Alliance'),
-- 澳洲
('QF', 'QFA', 'Qantas', '澳洲航空', 'Australia', 'OneWorld'),
('JQ', 'JST', 'Jetstar Airways', '捷星航空', 'Australia', NULL),
('NZ', 'ANZ', 'Air New Zealand', '紐西蘭航空', 'New Zealand', 'Star Alliance')
ON CONFLICT (iata_code) DO NOTHING;

END IF;
END $$;

-- ============================================
-- Part 6: 初始資料 - 機場
-- ============================================

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ref_airports' AND column_name='name_en') THEN

INSERT INTO public.ref_airports (iata_code, icao_code, name_en, name_zh, city_code, city_name_zh, country_code, timezone) VALUES
-- 台灣
('TPE', 'RCTP', 'Taiwan Taoyuan International Airport', '桃園國際機場', 'TPE', '台北', 'TW', 'Asia/Taipei'),
('TSA', 'RCSS', 'Taipei Songshan Airport', '台北松山機場', 'TPE', '台北', 'TW', 'Asia/Taipei'),
('KHH', 'RCKH', 'Kaohsiung International Airport', '高雄國際機場', 'KHH', '高雄', 'TW', 'Asia/Taipei'),
('RMQ', 'RCMQ', 'Taichung International Airport', '台中國際機場', 'RMQ', '台中', 'TW', 'Asia/Taipei'),
('TNN', 'RCNN', 'Tainan Airport', '台南機場', 'TNN', '台南', 'TW', 'Asia/Taipei'),
('HUN', 'RCYU', 'Hualien Airport', '花蓮機場', 'HUN', '花蓮', 'TW', 'Asia/Taipei'),
('TTT', 'RCFN', 'Taitung Airport', '台東機場', 'TTT', '台東', 'TW', 'Asia/Taipei'),
('MZG', 'RCQC', 'Magong Airport', '馬公機場', 'MZG', '澎湖', 'TW', 'Asia/Taipei'),
('KNH', 'RCBS', 'Kinmen Airport', '金門機場', 'KNH', '金門', 'TW', 'Asia/Taipei'),
-- 日本
('NRT', 'RJAA', 'Narita International Airport', '成田國際機場', 'TYO', '東京', 'JP', 'Asia/Tokyo'),
('HND', 'RJTT', 'Tokyo Haneda Airport', '羽田機場', 'TYO', '東京', 'JP', 'Asia/Tokyo'),
('KIX', 'RJBB', 'Kansai International Airport', '關西國際機場', 'OSA', '大阪', 'JP', 'Asia/Tokyo'),
('ITM', 'RJOO', 'Osaka Itami Airport', '大阪伊丹機場', 'OSA', '大阪', 'JP', 'Asia/Tokyo'),
('NGO', 'RJGG', 'Chubu Centrair International Airport', '中部國際機場', 'NGO', '名古屋', 'JP', 'Asia/Tokyo'),
('CTS', 'RJCC', 'New Chitose Airport', '新千歲機場', 'SPK', '札幌', 'JP', 'Asia/Tokyo'),
('FUK', 'RJFF', 'Fukuoka Airport', '福岡機場', 'FUK', '福岡', 'JP', 'Asia/Tokyo'),
('OKA', 'ROAH', 'Naha Airport', '那霸機場', 'OKA', '沖繩', 'JP', 'Asia/Tokyo'),
('ISG', 'ROIG', 'Ishigaki Airport', '石垣機場', 'ISG', '石垣島', 'JP', 'Asia/Tokyo'),
('MMY', 'ROMY', 'Miyako Airport', '宮古機場', 'MMY', '宮古島', 'JP', 'Asia/Tokyo'),
('SDJ', 'RJSS', 'Sendai Airport', '仙台機場', 'SDJ', '仙台', 'JP', 'Asia/Tokyo'),
('HIJ', 'RJOA', 'Hiroshima Airport', '廣島機場', 'HIJ', '廣島', 'JP', 'Asia/Tokyo'),
('KOJ', 'RJFK', 'Kagoshima Airport', '鹿兒島機場', 'KOJ', '鹿兒島', 'JP', 'Asia/Tokyo'),
('OIT', 'RJFO', 'Oita Airport', '大分機場', 'OIT', '大分', 'JP', 'Asia/Tokyo'),
('KMJ', 'RJFT', 'Kumamoto Airport', '熊本機場', 'KMJ', '熊本', 'JP', 'Asia/Tokyo'),
('NGS', 'RJFU', 'Nagasaki Airport', '長崎機場', 'NGS', '長崎', 'JP', 'Asia/Tokyo'),
('MYJ', 'RJOM', 'Matsuyama Airport', '松山機場', 'MYJ', '松山', 'JP', 'Asia/Tokyo'),
('TAK', 'RJOT', 'Takamatsu Airport', '高松機場', 'TAK', '高松', 'JP', 'Asia/Tokyo'),
('KCZ', 'RJOK', 'Kochi Airport', '高知機場', 'KCZ', '高知', 'JP', 'Asia/Tokyo'),
('AOJ', 'RJSA', 'Aomori Airport', '青森機場', 'AOJ', '青森', 'JP', 'Asia/Tokyo'),
('AKJ', 'RJEC', 'Asahikawa Airport', '旭川機場', 'AKJ', '旭川', 'JP', 'Asia/Tokyo'),
('OBO', 'RJCB', 'Tokachi-Obihiro Airport', '帶廣機場', 'OBO', '帶廣', 'JP', 'Asia/Tokyo'),
('KMQ', 'RJNK', 'Komatsu Airport', '小松機場', 'KMQ', '金澤', 'JP', 'Asia/Tokyo'),
('TOY', 'RJNT', 'Toyama Airport', '富山機場', 'TOY', '富山', 'JP', 'Asia/Tokyo'),
('KIJ', 'RJSN', 'Niigata Airport', '新潟機場', 'KIJ', '新潟', 'JP', 'Asia/Tokyo'),
-- 韓國
('ICN', 'RKSI', 'Incheon International Airport', '仁川國際機場', 'SEL', '首爾', 'KR', 'Asia/Seoul'),
('GMP', 'RKSS', 'Gimpo International Airport', '金浦機場', 'SEL', '首爾', 'KR', 'Asia/Seoul'),
('PUS', 'RKPK', 'Gimhae International Airport', '金海機場', 'PUS', '釜山', 'KR', 'Asia/Seoul'),
('CJU', 'RKPC', 'Jeju International Airport', '濟州機場', 'CJU', '濟州', 'KR', 'Asia/Seoul'),
('TAE', 'RKTN', 'Daegu International Airport', '大邱機場', 'TAE', '大邱', 'KR', 'Asia/Seoul'),
-- 香港/澳門
('HKG', 'VHHH', 'Hong Kong International Airport', '香港國際機場', 'HKG', '香港', 'HK', 'Asia/Hong_Kong'),
('MFM', 'VMMC', 'Macau International Airport', '澳門國際機場', 'MFM', '澳門', 'MO', 'Asia/Macau'),
-- 東南亞
('SIN', 'WSSS', 'Singapore Changi Airport', '樟宜機場', 'SIN', '新加坡', 'SG', 'Asia/Singapore'),
('BKK', 'VTBS', 'Suvarnabhumi Airport', '素萬那普機場', 'BKK', '曼谷', 'TH', 'Asia/Bangkok'),
('DMK', 'VTBD', 'Don Mueang International Airport', '廊曼機場', 'BKK', '曼谷', 'TH', 'Asia/Bangkok'),
('CNX', 'VTCC', 'Chiang Mai International Airport', '清邁機場', 'CNX', '清邁', 'TH', 'Asia/Bangkok'),
('HKT', 'VTSP', 'Phuket International Airport', '普吉機場', 'HKT', '普吉', 'TH', 'Asia/Bangkok'),
('KBV', 'VTSG', 'Krabi International Airport', '甲米機場', 'KBV', '甲米', 'TH', 'Asia/Bangkok'),
('USM', 'VTSM', 'Samui Airport', '蘇美島機場', 'USM', '蘇美島', 'TH', 'Asia/Bangkok'),
('HAN', 'VVNB', 'Noi Bai International Airport', '內排機場', 'HAN', '河內', 'VN', 'Asia/Ho_Chi_Minh'),
('SGN', 'VVTS', 'Tan Son Nhat International Airport', '新山一機場', 'SGN', '胡志明市', 'VN', 'Asia/Ho_Chi_Minh'),
('DAD', 'VVDN', 'Da Nang International Airport', '峴港機場', 'DAD', '峴港', 'VN', 'Asia/Ho_Chi_Minh'),
('KUL', 'WMKK', 'Kuala Lumpur International Airport', '吉隆坡機場', 'KUL', '吉隆坡', 'MY', 'Asia/Kuala_Lumpur'),
('PEN', 'WMKP', 'Penang International Airport', '檳城機場', 'PEN', '檳城', 'MY', 'Asia/Kuala_Lumpur'),
('BKI', 'WBKK', 'Kota Kinabalu International Airport', '亞庇機場', 'BKI', '亞庇', 'MY', 'Asia/Kuala_Lumpur'),
('MNL', 'RPLL', 'Ninoy Aquino International Airport', '馬尼拉機場', 'MNL', '馬尼拉', 'PH', 'Asia/Manila'),
('CEB', 'RPVM', 'Mactan-Cebu International Airport', '宿霧機場', 'CEB', '宿霧', 'PH', 'Asia/Manila'),
('CGK', 'WIII', 'Soekarno-Hatta International Airport', '雅加達機場', 'JKT', '雅加達', 'ID', 'Asia/Jakarta'),
('DPS', 'WADD', 'Ngurah Rai International Airport', '峇里島機場', 'DPS', '峇里島', 'ID', 'Asia/Makassar'),
('RGN', 'VYYY', 'Yangon International Airport', '仰光機場', 'RGN', '仰光', 'MM', 'Asia/Yangon'),
('REP', 'VDSR', 'Siem Reap International Airport', '暹粒機場', 'REP', '暹粒', 'KH', 'Asia/Phnom_Penh'),
('PNH', 'VDPP', 'Phnom Penh International Airport', '金邊機場', 'PNH', '金邊', 'KH', 'Asia/Phnom_Penh'),
-- 中國大陸
('PEK', 'ZBAA', 'Beijing Capital International Airport', '北京首都機場', 'BJS', '北京', 'CN', 'Asia/Shanghai'),
('PKX', 'ZBAD', 'Beijing Daxing International Airport', '北京大興機場', 'BJS', '北京', 'CN', 'Asia/Shanghai'),
('PVG', 'ZSPD', 'Shanghai Pudong International Airport', '上海浦東機場', 'SHA', '上海', 'CN', 'Asia/Shanghai'),
('SHA', 'ZSSS', 'Shanghai Hongqiao International Airport', '上海虹橋機場', 'SHA', '上海', 'CN', 'Asia/Shanghai'),
('CAN', 'ZGGG', 'Guangzhou Baiyun International Airport', '廣州白雲機場', 'CAN', '廣州', 'CN', 'Asia/Shanghai'),
('SZX', 'ZGSZ', 'Shenzhen Bao an International Airport', '深圳寶安機場', 'SZX', '深圳', 'CN', 'Asia/Shanghai'),
('CTU', 'ZUUU', 'Chengdu Shuangliu International Airport', '成都雙流機場', 'CTU', '成都', 'CN', 'Asia/Shanghai'),
('CKG', 'ZUCK', 'Chongqing Jiangbei International Airport', '重慶江北機場', 'CKG', '重慶', 'CN', 'Asia/Shanghai'),
('XMN', 'ZSAM', 'Xiamen Gaoqi International Airport', '廈門高崎機場', 'XMN', '廈門', 'CN', 'Asia/Shanghai'),
('HGH', 'ZSHC', 'Hangzhou Xiaoshan International Airport', '杭州蕭山機場', 'HGH', '杭州', 'CN', 'Asia/Shanghai'),
('NKG', 'ZSNJ', 'Nanjing Lukou International Airport', '南京祿口機場', 'NKG', '南京', 'CN', 'Asia/Shanghai')
ON CONFLICT (iata_code) DO NOTHING;

END IF;
END $$;

-- ============================================
-- Part 7: 初始資料 - 艙等/SSR/狀態碼
-- ============================================

INSERT INTO public.ref_booking_classes (code, cabin_type, description, priority) VALUES
('F', 'First', '頭等艙全票', 1),
('A', 'First', '頭等艙折扣', 2),
('P', 'First', '頭等艙優惠', 3),
('C', 'Business', '商務艙全票', 10),
('J', 'Business', '商務艙優惠', 11),
('D', 'Business', '商務艙折扣', 12),
('I', 'Business', '商務艙促銷', 13),
('Z', 'Business', '商務艙特價', 14),
('W', 'Premium Economy', '豪華經濟艙', 20),
('Y', 'Economy', '經濟艙全票', 30),
('B', 'Economy', '經濟艙折扣', 31),
('M', 'Economy', '經濟艙特價', 32),
('H', 'Economy', '經濟艙優惠', 33),
('K', 'Economy', '經濟艙折扣', 34),
('L', 'Economy', '經濟艙低價', 35),
('Q', 'Economy', '經濟艙低價', 36),
('T', 'Economy', '經濟艙促銷', 37),
('V', 'Economy', '經濟艙促銷', 38),
('S', 'Economy', '經濟艙特價', 39),
('N', 'Economy', '經濟艙特價', 40),
('R', 'Economy', '經濟艙限制', 41),
('G', 'Economy', '團體票', 50),
('U', 'Economy', '候補艙', 51),
('E', 'Economy', '特殊艙', 52),
('O', 'Economy', '開放艙', 53),
('X', 'Economy', '取消艙', 99)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ref_ssr_codes (code, category, description_en, description_zh) VALUES
-- 餐食
('AVML', 'Meal', 'Asian Vegetarian Meal', '亞洲素食'),
('BBML', 'Meal', 'Baby Meal', '嬰兒餐'),
('BLML', 'Meal', 'Bland Meal', '清淡餐'),
('CHML', 'Meal', 'Child Meal', '兒童餐'),
('DBML', 'Meal', 'Diabetic Meal', '糖尿病餐'),
('FPML', 'Meal', 'Fruit Platter Meal', '水果餐'),
('GFML', 'Meal', 'Gluten-Free Meal', '無麩質餐'),
('HFML', 'Meal', 'High Fiber Meal', '高纖餐'),
('HNML', 'Meal', 'Hindu Non-Vegetarian Meal', '印度非素食'),
('KSML', 'Meal', 'Kosher Meal', '猶太餐'),
('LCML', 'Meal', 'Low Calorie Meal', '低卡餐'),
('LFML', 'Meal', 'Low Fat Meal', '低脂餐'),
('LPML', 'Meal', 'Low Protein Meal', '低蛋白餐'),
('LSML', 'Meal', 'Low Salt Meal', '低鈉餐'),
('MOML', 'Meal', 'Muslim Meal', '穆斯林餐'),
('NLML', 'Meal', 'No Lactose Meal', '無乳糖餐'),
('ORML', 'Meal', 'Oriental Meal', '東方餐'),
('PFML', 'Meal', 'Peanut Free Meal', '無花生餐'),
('SFML', 'Meal', 'Seafood Meal', '海鮮餐'),
('SPML', 'Meal', 'Special Meal', '特別餐'),
('VGML', 'Meal', 'Vegetarian Meal', '素食餐'),
('VJML', 'Meal', 'Vegetarian Jain Meal', '耆那教素食'),
('VLML', 'Meal', 'Vegetarian Lacto-Ovo Meal', '蛋奶素'),
('VOML', 'Meal', 'Vegetarian Oriental Meal', '東方素食'),
('RVML', 'Meal', 'Raw Vegetarian Meal', '生機素食'),
-- 輪椅
('WCHR', 'Wheelchair', 'Wheelchair - Can walk to seat', '輪椅（可走路）'),
('WCHS', 'Wheelchair', 'Wheelchair - Cannot ascend stairs', '輪椅（不能上下樓）'),
('WCHC', 'Wheelchair', 'Wheelchair - Immobile', '輪椅（完全不能行走）'),
('WCBD', 'Wheelchair', 'Wheelchair - Dry battery', '輪椅（乾電池）'),
('WCBW', 'Wheelchair', 'Wheelchair - Wet battery', '輪椅（濕電池）'),
('WCLB', 'Wheelchair', 'Wheelchair - Lithium battery', '輪椅（鋰電池）'),
('WCMP', 'Wheelchair', 'Wheelchair - Manual', '輪椅（手動）'),
('WCOB', 'Wheelchair', 'Wheelchair - Onboard', '機上輪椅'),
-- 障礙服務
('BLND', 'Disability', 'Blind Passenger', '視障旅客'),
('DEAF', 'Disability', 'Deaf Passenger', '聽障旅客'),
('DPNA', 'Disability', 'Developmental/Intellectual Disability', '智能障礙旅客'),
('MAAS', 'Assistance', 'Meet and Assist', '接機協助'),
('MEDA', 'Medical', 'Medical Assistance', '醫療協助'),
('OXYG', 'Medical', 'Oxygen Required', '需氧氣'),
('STCR', 'Medical', 'Stretcher', '擔架'),
-- 其他
('UMNR', 'Minor', 'Unaccompanied Minor', '無人陪伴兒童'),
('YPTA', 'Minor', 'Young Passenger Travelling Alone', '單獨旅行年輕旅客'),
('PETC', 'Pet', 'Pet in Cabin', '客艙寵物'),
('AVIH', 'Pet', 'Pet in Hold', '貨艙寵物'),
('EXST', 'Seat', 'Extra Seat', '額外座位'),
('CBBG', 'Seat', 'Cabin Baggage Seat', '座位行李'),
('NSSA', 'Seat', 'No Smoking Aisle Seat', '禁菸走道位'),
('NSSW', 'Seat', 'No Smoking Window Seat', '禁菸靠窗位'),
('NSST', 'Seat', 'No Smoking Seat', '禁菸座位'),
('BIKE', 'Sport', 'Bicycle', '自行車'),
('SPEQ', 'Sport', 'Sport Equipment', '運動器材'),
('GPST', 'Other', 'Group Seat Request', '團體座位'),
('GRPS', 'Other', 'Group Service', '團體服務'),
('LANG', 'Other', 'Language Assistance', '語言協助'),
('INFT', 'Infant', 'Infant', '嬰兒'),
('TKNE', 'Ticket', 'Electronic Ticket Number', '電子票號'),
('TKNM', 'Ticket', 'Manual Ticket Number', '手開票號'),
('DOCS', 'Document', 'Travel Document', '旅行證件'),
('DOCA', 'Document', 'Address Document', '地址資料'),
('DOCO', 'Document', 'Other Document', '其他證件')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ref_status_codes (code, category, description_en, description_zh) VALUES
-- 確認
('HK', 'Confirmed', 'Hold Confirmed', '已確認'),
('KK', 'Confirmed', 'Confirming', '確認中'),
('TK', 'Confirmed', 'Confirming with new times', '確認（新時間）'),
('RR', 'Confirmed', 'Reconfirmed', '已重確認'),
('OK', 'Confirmed', 'Confirmed', '確認'),
('SS', 'Confirmed', 'Sold Segment', '已售段'),
-- 候補
('HL', 'Waitlist', 'Have Listed', '候補中'),
('HN', 'Waitlist', 'Holding Need', '需求中'),
('KL', 'Waitlist', 'Confirming from waitlist', '從候補確認'),
('UU', 'Waitlist', 'Unable, waitlisted', '無法確認，已候補'),
('LL', 'Waitlist', 'Waitlisted', '候補'),
('PN', 'Waitlist', 'Pending', '待處理'),
-- 取消
('HX', 'Cancelled', 'Holding Cancelled', '已取消'),
('NO', 'Cancelled', 'No Action Taken', '無動作'),
('XX', 'Cancelled', 'Cancelled', '已取消'),
('XK', 'Cancelled', 'Cancel Confirmed', '取消確認'),
-- 無法確認
('UC', 'Unable', 'Unable to Confirm', '無法確認'),
('UN', 'Unable', 'Unable, flight not operating', '無法確認（航班不運行）'),
('US', 'Unable', 'Unable to accept sale', '無法接受銷售'),
-- Ghost
('GK', 'Ghost', 'Ghost Confirmed', 'Ghost 確認'),
('GL', 'Ghost', 'Ghost Waitlist', 'Ghost 候補'),
('GN', 'Ghost', 'Ghost Need', 'Ghost 需求'),
-- 其他
('RQ', 'Request', 'Requested', '已請求'),
('NN', 'Request', 'Need', '需要'),
('IS', 'Info', 'Sold Segment', '售出段'),
('SA', 'Space', 'Space Available', '有空位'),
('SC', 'Schedule', 'Schedule Change', '時刻變更'),
('TN', 'Time', 'Time Not Known', '時間未知'),
('WL', 'Waitlist', 'Waitlist', '候補名單'),
('WK', 'Work', 'Working', '處理中')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 驗證
-- ============================================

DO $$
DECLARE
  airline_count integer;
  airport_count integer;
BEGIN
  SELECT COUNT(*) INTO airline_count FROM public.ref_airlines;
  SELECT COUNT(*) INTO airport_count FROM public.ref_airports;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PNR 管理系統建立完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已建立的表格:';
  RAISE NOTICE '  • ref_airlines: % 筆', airline_count;
  RAISE NOTICE '  • ref_airports: % 筆', airport_count;
  RAISE NOTICE '  • ref_booking_classes';
  RAISE NOTICE '  • ref_ssr_codes';
  RAISE NOTICE '  • ref_status_codes';
  RAISE NOTICE '  • pnr_records';
  RAISE NOTICE '  • pnr_passengers';
  RAISE NOTICE '  • pnr_segments';
  RAISE NOTICE '  • pnr_ssr_elements';
  RAISE NOTICE '  • pnr_remarks';
  RAISE NOTICE '';
  RAISE NOTICE '功能:';
  RAISE NOTICE '  • 儲存 PNR 記錄與開票期限';
  RAISE NOTICE '  • 追蹤航班段與旅客資料';
  RAISE NOTICE '  • 管理 SSR 特殊服務';
  RAISE NOTICE '  • 參考資料支援離線解析';
  RAISE NOTICE '========================================';
END $$;
