-- =============================================
-- 奢華飯店初始資料
-- 各國頂級奢華飯店 seed data
-- =============================================

BEGIN;

-- 先取得國家和城市 ID（注意：countries/cities 的 id 是 text 類型）
DO $$
DECLARE
  -- 日本
  v_japan_id text;
  v_tokyo_id text;
  v_kyoto_id text;
  v_osaka_id text;
  v_hokkaido_sapporo_id text;
  v_fukuoka_id text;
  v_nikko_id text;
  -- 泰國
  v_thailand_id text;
  v_bangkok_id text;
  v_phuket_id text;
  v_chiang_mai_id text;
  -- 韓國
  v_korea_id text;
  v_seoul_id text;
  v_busan_id text;
  v_jeju_id text;
  -- 越南
  v_vietnam_id text;
  v_hanoi_id text;
  v_ho_chi_minh_id text;
  v_danang_id text;
  -- 中國
  v_china_id text;
  v_shanghai_id text;
  v_beijing_id text;
BEGIN
  -- 取得日本城市 ID
  SELECT id INTO v_japan_id FROM countries WHERE code = 'japan' OR name = '日本' LIMIT 1;
  SELECT id INTO v_tokyo_id FROM cities WHERE name = '東京' AND country_id = v_japan_id LIMIT 1;
  SELECT id INTO v_kyoto_id FROM cities WHERE name = '京都' AND country_id = v_japan_id LIMIT 1;
  SELECT id INTO v_osaka_id FROM cities WHERE name = '大阪' AND country_id = v_japan_id LIMIT 1;
  SELECT id INTO v_hokkaido_sapporo_id FROM cities WHERE name = '札幌' AND country_id = v_japan_id LIMIT 1;
  SELECT id INTO v_fukuoka_id FROM cities WHERE name = '福岡' AND country_id = v_japan_id LIMIT 1;
  SELECT id INTO v_nikko_id FROM cities WHERE name = '日光' AND country_id = v_japan_id LIMIT 1;

  -- 取得泰國城市 ID
  SELECT id INTO v_thailand_id FROM countries WHERE code = 'thailand' OR name = '泰國' LIMIT 1;
  SELECT id INTO v_bangkok_id FROM cities WHERE name = '曼谷' AND country_id = v_thailand_id LIMIT 1;
  SELECT id INTO v_phuket_id FROM cities WHERE name = '普吉島' AND country_id = v_thailand_id LIMIT 1;
  SELECT id INTO v_chiang_mai_id FROM cities WHERE name = '清邁' AND country_id = v_thailand_id LIMIT 1;

  -- 取得韓國城市 ID
  SELECT id INTO v_korea_id FROM countries WHERE code = 'korea' OR name = '韓國' LIMIT 1;
  SELECT id INTO v_seoul_id FROM cities WHERE name = '首爾' AND country_id = v_korea_id LIMIT 1;
  SELECT id INTO v_busan_id FROM cities WHERE name = '釜山' AND country_id = v_korea_id LIMIT 1;
  SELECT id INTO v_jeju_id FROM cities WHERE name = '濟州島' AND country_id = v_korea_id LIMIT 1;

  -- 取得越南城市 ID（注意：可能需要先新增越南城市）
  SELECT id INTO v_vietnam_id FROM countries WHERE code = 'vietnam' OR name = '越南' LIMIT 1;
  IF v_vietnam_id IS NOT NULL THEN
    SELECT id INTO v_hanoi_id FROM cities WHERE name = '河內' AND country_id = v_vietnam_id LIMIT 1;
    SELECT id INTO v_ho_chi_minh_id FROM cities WHERE name = '胡志明市' AND country_id = v_vietnam_id LIMIT 1;
    SELECT id INTO v_danang_id FROM cities WHERE name = '峴港' AND country_id = v_vietnam_id LIMIT 1;
  END IF;

  -- 取得中國城市 ID
  SELECT id INTO v_china_id FROM countries WHERE code = 'china' OR name = '中國' LIMIT 1;
  SELECT id INTO v_shanghai_id FROM cities WHERE name = '上海' AND country_id = v_china_id LIMIT 1;
  SELECT id INTO v_beijing_id FROM cities WHERE name = '北京' AND country_id = v_china_id LIMIT 1;

  -- ========== 日本奢華飯店 ==========

  -- 東京
  IF v_tokyo_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('安縵東京', 'Aman Tokyo', 'Aman', v_japan_id, v_tokyo_id, 5, 'ultra-luxury', 'city',
     '位於大手町塔的頂層，以傳統日式旅館為靈感，融合和紙、榻榻米與天然石材，84間客房均超過71平方米。米其林二星酒店。',
     ARRAY['米其林二星酒店', '全東京最大標準客房', '33樓空中花園', '頂級水療中心'],
     '5', 1200, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 1),

    ('東京麗思卡爾頓', 'The Ritz-Carlton Tokyo', 'Ritz-Carlton', v_japan_id, v_tokyo_id, 5, 'luxury', 'city',
     '位於六本木中城53樓，可俯瞰東京灣與富士山景色。247間客房配備落地窗，是城市天際線的最佳觀景點。',
     ARRAY['53樓絕美景觀', '可眺望富士山', '頂級水療中心', '米其林餐廳'],
     '4', 800, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 2),

    ('東京柏悅酒店', 'Park Hyatt Tokyo', 'Park Hyatt', v_japan_id, v_tokyo_id, 5, 'luxury', 'city',
     '位於新宿公園塔52樓，因電影《乜乜一縷情》而聞名。1994年開業，2025年重新開幕。設計結合傳統與現代美學。',
     ARRAY['Lost in Translation 電影場景', 'New York Grill 傳奇餐廳', '52樓絕美夜景', '即將完成30週年翻新'],
     '4', 700, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 3),

    ('東京半島酒店', 'The Peninsula Tokyo', 'Peninsula', v_japan_id, v_tokyo_id, 5, 'luxury', 'city',
     '位於皇居外苑對面，融合現代與傳統日式設計。314間客房均配備先進科技設備與豪華浴室。',
     ARRAY['皇居景觀', '勞斯萊斯接送服務', 'Peter 餐廳', '頂級水療'],
     '4', 750, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true}'::jsonb,
     true, false, 4),

    ('東京文華東方酒店', 'Mandarin Oriental Tokyo', 'Mandarin Oriental', v_japan_id, v_tokyo_id, 5, 'luxury', 'city',
     '位於日本橋三井塔30-36樓，結合傳統日本美學與現代奢華。179間客房可欣賞城市全景或富士山景。',
     ARRAY['日本橋絕佳位置', '米其林餐廳', '頂級水療中心', '精緻日式設計'],
     '4', 700, 'USD',
     '{"spa": true, "pool": false, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 5);
  END IF;

  -- 京都
  IF v_kyoto_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('安縵京都', 'Aman Kyoto', 'Aman', v_japan_id, v_kyoto_id, 5, 'ultra-luxury', 'resort',
     '隱身於左大文字山腳下32公頃森林中的秘境酒店。26間客房融入自然環境，提供極致私密的京都體驗。米其林二星酒店。',
     ARRAY['米其林二星酒店', '32公頃私人森林', '極致私密體驗', '頂級懷石料理'],
     '5', 1500, 'USD',
     '{"spa": true, "pool": false, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true}'::jsonb,
     false, true, 10),

    ('京都四季酒店', 'Four Seasons Kyoto', 'Four Seasons', v_japan_id, v_kyoto_id, 5, 'luxury', 'city',
     '坐落於800年歷史的積翠園庭園旁，距京都車站10分鐘車程。180間客房融合現代設計與傳統日式美學。米其林一星酒店。',
     ARRAY['米其林一星酒店', '800年歷史庭園', '池塘景觀', '傳統茶道體驗'],
     '4', 900, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 11),

    ('京都麗思卡爾頓', 'The Ritz-Carlton Kyoto', 'Ritz-Carlton', v_japan_id, v_kyoto_id, 5, 'luxury', 'city',
     '位於鴨川河畔，134間客房融合現代與傳統京都風格。距祇園15分鐘步行，錦市場20分鐘步行。',
     ARRAY['鴨川河畔絕美位置', '距祇園步行可達', '傳統日式水療', '米其林餐廳'],
     '4', 850, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 12),

    ('京都柏悅酒店', 'Park Hyatt Kyoto', 'Park Hyatt', v_japan_id, v_kyoto_id, 5, 'luxury', 'resort',
     '2019年開幕，位於東山區寧靜街道，鄰近高台寺。低層建築採用傳統旅館風格，可眺望清水寺與京都市景。米其林一星酒店。',
     ARRAY['米其林一星酒店', '東山絕佳位置', '可眺望清水寺', '傳統旅館風格設計'],
     '4', 900, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 13);
  END IF;

  -- 大阪
  IF v_osaka_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('大阪瑞吉酒店', 'The St. Regis Osaka', 'St. Regis', v_japan_id, v_osaka_id, 5, 'luxury', 'city',
     '位於御堂筋大道旁，160間客房融合經典歐式風格與日本美學。提供24小時管家服務。',
     ARRAY['御堂筋絕佳位置', '24小時管家服務', '米其林餐廳', 'Iridium Spa'],
     '4', 600, 'USD',
     '{"spa": true, "pool": false, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true}'::jsonb,
     true, true, 20),

    ('大阪康萊德酒店', 'Conrad Osaka', 'Conrad', v_japan_id, v_osaka_id, 5, 'luxury', 'city',
     '位於中之島Festival Tower 33-40樓，164間客房可欣賞大阪市景與淀川河景。',
     ARRAY['中之島絕美景觀', '40樓空中酒吧', '當代藝術收藏', '米其林餐廳'],
     '3', 450, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 21);
  END IF;

  -- 日光
  IF v_nikko_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('日光麗思卡爾頓', 'The Ritz-Carlton Nikko', 'Ritz-Carlton', v_japan_id, v_nikko_id, 5, 'luxury', 'resort',
     '位於中禪寺湖畔，94間客房融合傳統日式建築與現代奢華。可欣賞男體山與湖景。米其林二星酒店。',
     ARRAY['米其林二星酒店', '中禪寺湖畔絕美位置', '男體山景觀', '溫泉水療'],
     '4', 700, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "onsen": true}'::jsonb,
     true, true, 30);
  END IF;

  -- ========== 泰國奢華飯店 ==========

  -- 曼谷
  IF v_bangkok_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('曼谷嘉佩樂酒店', 'Capella Bangkok', 'Capella', v_thailand_id, v_bangkok_id, 5, 'ultra-luxury', 'city',
     '2024年世界50最佳酒店第一名。位於昭披耶河畔，101間客房與別墅，提供絕美河景。',
     ARRAY['2024世界最佳酒店第一名', '昭披耶河畔', '私人別墅', 'Cote by Mauro Colagreco 餐廳'],
     '5', 800, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true}'::jsonb,
     true, true, 40),

    ('曼谷文華東方酒店', 'Mandarin Oriental Bangkok', 'Mandarin Oriental', v_thailand_id, v_bangkok_id, 5, 'ultra-luxury', 'city',
     '百年傳奇酒店，自1876年起接待各國名人。位於昭披耶河畔，融合殖民風情與現代奢華。',
     ARRAY['百年傳奇酒店', '昭披耶河畔', '作家套房', '傳奇水療中心'],
     '5', 600, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true}'::jsonb,
     true, true, 41),

    ('曼谷四季酒店', 'Four Seasons Hotel Bangkok at Chao Phraya River', 'Four Seasons', v_thailand_id, v_bangkok_id, 5, 'luxury', 'city',
     '2020年開幕，位於昭披耶河畔歷史街區。299間客房融合泰式傳統與現代設計。2025年最佳新酒店。',
     ARRAY['2025年最佳新酒店', '河畔歷史街區', '米其林餐廳', '水療與瑜伽'],
     '4', 500, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 42),

    ('曼谷半島酒店', 'The Peninsula Bangkok', 'Peninsula', v_thailand_id, v_bangkok_id, 5, 'luxury', 'city',
     '位於昭披耶河畔，370間客房均可欣賞河景。以W形建築設計聞名。',
     ARRAY['W形建築設計', '全客房河景', '直升機接送', '頂級水療'],
     '4', 350, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 43),

    ('曼谷柏悅酒店', 'Park Hyatt Bangkok', 'Park Hyatt', v_thailand_id, v_bangkok_id, 5, 'luxury', 'city',
     '位於曼谷市中心，222間客房融合現代設計與泰式元素。頂樓酒吧可欣賞城市天際線。',
     ARRAY['市中心絕佳位置', '頂樓景觀酒吧', 'Embassy Spa', '當代泰式設計'],
     '3', 350, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 44);
  END IF;

  -- 清邁
  IF v_chiang_mai_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('清邁四季度假村', 'Four Seasons Resort Chiang Mai', 'Four Seasons', v_thailand_id, v_chiang_mai_id, 5, 'luxury', 'resort',
     '位於Mae Rim山谷，俯瞰梯田稻田。98棟別墅與涼亭融合蘭納建築風格，提供水牛耕田等獨特體驗。',
     ARRAY['梯田稻田景觀', '蘭納建築風格', '水牛耕田體驗', '得獎水療中心'],
     '4', 600, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 50),

    ('137柱府邸', '137 Pillars House', 'Independent', v_thailand_id, v_chiang_mai_id, 5, 'boutique', 'city',
     '獲獎精品酒店，30間套房圍繞1800年代殖民柚木建築。距屏河與古城步行可達。',
     ARRAY['殖民柚木建築', '屏河步行可達', '精品酒店體驗', '歷史文化氛圍'],
     '4', 580, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     false, true, 51),

    ('清邁黛蘭塔維', 'The Dhara Dhevi Chiang Mai', 'Independent', v_thailand_id, v_chiang_mai_id, 5, 'ultra-luxury', 'resort',
     '佔地60英畝的皇家風格度假村，靈感來自蘭納王朝建築。別墅與套房採用傳統柚木設計。',
     ARRAY['60英畝皇家度假村', '蘭納王朝建築', '殖民文化博物館', '頂級水療村'],
     '4', 500, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 52);
  END IF;

  -- 普吉島
  IF v_phuket_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('普吉安縵度假村', 'Amanpuri', 'Aman', v_thailand_id, v_phuket_id, 5, 'ultra-luxury', 'resort',
     '安縵旗艦度假村，位於安達曼海私人海灣。40棟涼亭與30棟別墅，提供極致私密的度假體驗。',
     ARRAY['安縵旗艦度假村', '私人海灣', '泰式涼亭設計', '頂級水療與遊艇'],
     '5', 1200, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true, "beach": true}'::jsonb,
     false, true, 55),

    ('普吉島悅榕莊', 'Banyan Tree Phuket', 'Banyan Tree', v_thailand_id, v_phuket_id, 5, 'luxury', 'resort',
     '位於邦濤灣瀉湖旁，173棟別墅均配備私人泳池。以得獎水療著稱。',
     ARRAY['私人泳池別墅', '得獎水療中心', '瀉湖景觀', '高爾夫球場'],
     '4', 500, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "beach": true, "golf": true}'::jsonb,
     true, false, 56);
  END IF;

  -- ========== 韓國奢華飯店 ==========

  -- 首爾
  IF v_seoul_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('首爾柏悅酒店', 'Park Hyatt Seoul', 'Park Hyatt', v_korea_id, v_seoul_id, 5, 'luxury', 'city',
     '位於江南區中心，由日本Super Potato設計。185間客房融合橡木、楓木與花崗岩，24樓設有泳池與水療。',
     ARRAY['江南區中心', 'Super Potato設計', 'BOSE音響系統', '24樓空中泳池'],
     '4', 450, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 60),

    ('首爾新羅酒店', 'The Shilla Seoul', 'Shilla', v_korea_id, v_seoul_id, 5, 'luxury', 'city',
     '韓式奢華代表，位於景福宮與明洞附近。融合傳統韓式美學與現代設計。',
     ARRAY['韓式奢華代表', '景福宮步行可達', '頂級水療中心', '免稅店'],
     '4', 400, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 61),

    ('首爾四季酒店', 'Four Seasons Hotel Seoul', 'Four Seasons', v_korea_id, v_seoul_id, 5, 'luxury', 'city',
     '位於光化門商業區，317間客房融合傳統韓式元素與當代設計。設有米其林餐廳與頂級水療。',
     ARRAY['光化門商業區', '米其林餐廳', '頂級水療', '當代韓式設計'],
     '4', 450, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 62),

    ('首爾Signiel酒店', 'Signiel Seoul', 'Signiel', v_korea_id, v_seoul_id, 5, 'ultra-luxury', 'city',
     '位於樂天世界塔87-101樓，韓國最高酒店。235間客房可欣賞首爾全景，設有米其林餐廳Stay與Bicena。',
     ARRAY['韓國最高酒店', '樂天世界塔', '米其林餐廳Stay', 'Bar 81香檳酒吧'],
     '5', 600, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 63);
  END IF;

  -- 釜山
  IF v_busan_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('釜山柏悅酒店', 'Park Hyatt Busan', 'Park Hyatt', v_korea_id, v_busan_id, 5, 'luxury', 'city',
     '位於海雲台海灘對面，可眺望廣安大橋與遊艇碼頭。269間客房採用優雅的米色與木質設計。',
     ARRAY['海雲台海灘對面', '廣安大橋景觀', '遊艇碼頭景觀', '室內花園泳池'],
     '4', 350, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 70),

    ('釜山Signiel酒店', 'Signiel Busan', 'Signiel', v_korea_id, v_busan_id, 5, 'luxury', 'city',
     '位於釜山最高塔樓頂層，可欣賞壯闘海景。設有米其林餐廳、水療、室內外泳池。',
     ARRAY['釜山最高塔樓', '絕美海景', '米其林餐廳', '室內外泳池'],
     '4', 400, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 71);
  END IF;

  -- 濟州島
  IF v_jeju_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('濟州新羅酒店', 'The Shilla Jeju', 'Shilla', v_korea_id, v_jeju_id, 5, 'luxury', 'resort',
     '位於中文海灘附近，熱帶花園環繞。429間客房可欣賞山景、海景或花園景，面積40-277平方米。',
     ARRAY['中文海灘步行可達', '熱帶花園', '山海花園三景', '高爾夫球場'],
     '4', 350, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "beach": true, "golf": true}'::jsonb,
     true, true, 75);
  END IF;

  -- ========== 越南奢華飯店 ==========

  -- 河內
  IF v_hanoi_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('河內索菲特傳奇大都會酒店', 'Sofitel Legend Metropole Hanoi', 'Sofitel Legend', v_vietnam_id, v_hanoi_id, 5, 'ultra-luxury', 'city',
     '自1901年起的傳奇酒店，曾接待卓別林、乃美、格雷安格林等名人。363間客房分布於歷史大都會翼與現代歌劇翼。',
     ARRAY['1901年傳奇酒店', '名人下榻處', '法式殖民建築', '戰時防空洞導覽'],
     '4', 350, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 80);
  END IF;

  -- 胡志明市
  IF v_ho_chi_minh_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('西貢柏悅酒店', 'Park Hyatt Saigon', 'Park Hyatt', v_vietnam_id, v_ho_chi_minh_id, 5, 'luxury', 'city',
     '胡志明市頂級奢華酒店，法式殖民風格設計。位於市中心，2025年獲米其林一星酒店。',
     ARRAY['米其林一星酒店', '法式殖民風格', '市中心絕佳位置', 'Opera 餐廳'],
     '4', 300, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 85);
  END IF;

  -- 峴港
  IF v_danang_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('峴港洲際陽光半島度假村', 'InterContinental Danang Sun Peninsula Resort', 'InterContinental', v_vietnam_id, v_danang_id, 5, 'ultra-luxury', 'resort',
     '由Bill Bensley設計的建築奇蹟，位於山茶半島山坡上。融合越南寺廟元素與現代設計，被熱帶雨林環繞。',
     ARRAY['Bill Bensley設計', '山茶半島絕美位置', '越南寺廟元素', '米其林餐廳La Maison 1888'],
     '5', 500, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "beach": true}'::jsonb,
     true, true, 90);
  END IF;

  -- ========== 中國奢華飯店 ==========

  -- 上海
  IF v_shanghai_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('上海外灘華爾道夫酒店', 'Waldorf Astoria Shanghai on the Bund', 'Waldorf Astoria', v_china_id, v_shanghai_id, 5, 'ultra-luxury', 'city',
     '由1910年上海總會改建，位於外灘絕佳位置。260間客房融合Art Deco風格與現代奢華。',
     ARRAY['1910年歷史建築', '外灘絕佳位置', 'Art Deco設計', '廊吧傳奇酒吧'],
     '4', 400, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, true, 95),

    ('上海柏悅酒店', 'Park Hyatt Shanghai', 'Park Hyatt', v_china_id, v_shanghai_id, 5, 'luxury', 'city',
     '位於上海環球金融中心79-93樓，曾是世界最高酒店。174間客房可俯瞰浦東與外灘全景。',
     ARRAY['環球金融中心', '曾世界最高酒店', '79-93樓絕美景觀', '100世紀大道餐廳'],
     '4', 350, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true}'::jsonb,
     true, false, 96);
  END IF;

  -- 北京
  IF v_beijing_id IS NOT NULL THEN
    INSERT INTO luxury_hotels (name, name_en, brand, country_id, city_id, star_rating, hotel_class, category, description, highlights, price_range, avg_price_per_night, currency, facilities, group_friendly, is_featured, display_order) VALUES
    ('北京頤和安縵', 'Aman at Summer Palace Beijing', 'Aman', v_china_id, v_beijing_id, 5, 'ultra-luxury', 'resort',
     '位於頤和園旁，由歷史建築群改建。51間套房融合明清建築風格，提供皇家般的私密體驗。',
     ARRAY['頤和園旁絕美位置', '明清建築風格', '皇家般私密體驗', '中式庭園'],
     '5', 800, 'USD',
     '{"spa": true, "pool": true, "gym": true, "restaurant": true, "bar": true, "concierge": true, "butler": true}'::jsonb,
     false, true, 100);
  END IF;

END $$;

COMMIT;
