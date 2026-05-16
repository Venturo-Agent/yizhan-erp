-- 新增更多花蓮、南投景點

DO $$
DECLARE
  taiwan_id text;
  hualien_id text;
  nantou_id text;
BEGIN
  -- 取得台灣 ID
  SELECT id INTO taiwan_id FROM public.countries WHERE code = 'TW' LIMIT 1;

  -- 取得花蓮 ID
  SELECT id INTO hualien_id FROM public.cities WHERE name = '花蓮' AND country_id = taiwan_id LIMIT 1;

  -- 取得南投 ID
  SELECT id INTO nantou_id FROM public.cities WHERE name = '南投' AND country_id = taiwan_id LIMIT 1;

  IF hualien_id IS NULL OR nantou_id IS NULL THEN
    RAISE NOTICE '找不到花蓮或南投，請先執行前面的 migration';
    RETURN;
  END IF;

  -- ========== 更多花蓮景點 ==========
  INSERT INTO public.attractions (name, name_en, description, country_id, city_id, category, address, latitude, longitude, duration_minutes, is_active, display_order)
  VALUES
  ('白楊步道', 'Baiyang Trail', '太魯閣內著名步道，終點有水濂洞瀑布', taiwan_id, hualien_id, '步道', '花蓮縣秀林鄉天祥', 24.1833, 121.4889, 120, true, 61),
  ('錐麓古道', 'Zhuilu Old Trail', '日治時期開鑿的斷崖古道，需申請入山證', taiwan_id, hualien_id, '步道', '花蓮縣秀林鄉富世村', 24.1700, 121.5500, 360, true, 62),
  ('慕谷慕魚', 'Mukumugi', '秘境溪谷，清澈見底的翡翠色溪水', taiwan_id, hualien_id, '自然', '花蓮縣秀林鄉銅門村', 24.0253, 121.4658, 180, true, 63),
  ('遠雄海洋公園', 'Farglory Ocean Park', '台灣東部最大的海洋主題樂園', taiwan_id, hualien_id, '體驗', '花蓮縣壽豐鄉鹽寮村福德189號', 23.9086, 121.5644, 360, true, 64),
  ('松園別館', 'Pine Garden', '日治時期軍事指揮所，百年松林環繞', taiwan_id, hualien_id, '歷史', '花蓮縣花蓮市松園街65號', 23.9783, 121.6103, 60, true, 65),
  ('石梯坪', 'Shitiping', '壯觀的海蝕地形與潮間帶生態', taiwan_id, hualien_id, '自然', '花蓮縣豐濱鄉石梯坪52號', 23.4939, 121.5069, 90, true, 66),
  ('六十石山', 'Mount Liushidan', '花東縱谷金針花海聖地，每年8-9月盛開', taiwan_id, hualien_id, '自然', '花蓮縣富里鄉竹田村', 23.2417, 121.2583, 120, true, 67),
  ('赤科山', 'Chike Mountain', '另一處金針花海景點，與六十石山齊名', taiwan_id, hualien_id, '自然', '花蓮縣玉里鎮觀音里', 23.3167, 121.2833, 120, true, 68),
  ('吉安慶修院', 'Yoshino Shingon Mission', '日治時期日本移民村的真言宗寺院', taiwan_id, hualien_id, '寺廟', '花蓮縣吉安鄉中興路345-1號', 23.9614, 121.5672, 45, true, 69),
  ('新城天主堂', 'Shincheng Catholic Church', '諾亞方舟造型教堂，前身為日本神社', taiwan_id, hualien_id, '歷史', '花蓮縣新城鄉博愛路64號', 24.1281, 121.6403, 30, true, 70),
  ('立川漁場', 'Lichuan Fish Farm', '黃金蜆的故鄉，可體驗摸蜆仔', taiwan_id, hualien_id, '體驗', '花蓮縣壽豐鄉魚池45號', 23.8983, 121.5136, 90, true, 71),
  ('月洞', 'Moon Cave', '神秘的鐘乳石洞穴，需搭船進入', taiwan_id, hualien_id, '自然', '花蓮縣豐濱鄉港口村石門班哨角', 23.5097, 121.5147, 60, true, 72),
  ('花蓮文化創意產業園區', 'Hualien Cultural and Creative Industries Park', '舊酒廠改建的文創園區', taiwan_id, hualien_id, '文創', '花蓮縣花蓮市中華路144號', 23.9786, 121.6017, 90, true, 73),
  ('親不知子斷崖', 'Qinbuzhizi Cliff', '驚險的透明天空步道，緊貼峭壁', taiwan_id, hualien_id, '自然', '花蓮縣豐濱鄉台11線', 23.6500, 121.5167, 45, true, 74),
  ('馬太鞍濕地', 'Mataian Wetland', '阿美族傳統漁獵文化保存地', taiwan_id, hualien_id, '自然', '花蓮縣光復鄉大全街', 23.6678, 121.4219, 90, true, 75);

  -- ========== 更多南投景點 ==========
  INSERT INTO public.attractions (name, name_en, description, country_id, city_id, category, address, latitude, longitude, duration_minutes, is_active, display_order)
  VALUES
  ('水社碼頭', 'Shuishe Pier', '日月潭最熱鬧的碼頭，遊湖船起點', taiwan_id, nantou_id, '地標', '南投縣魚池鄉中山路163號', 23.8658, 120.9106, 30, true, 76),
  ('伊達邵碼頭', 'Ita Thao Pier', '邵族部落所在地，有原住民美食街', taiwan_id, nantou_id, '老街', '南投縣魚池鄉義勇街', 23.8533, 120.9333, 90, true, 77),
  ('玄光寺', 'Xuanguang Temple', '日月潭知名寺廟，阿婆茶葉蛋在此', taiwan_id, nantou_id, '寺廟', '南投縣魚池鄉中正路389號', 23.8561, 120.9264, 45, true, 78),
  ('玄奘寺', 'Xuanzang Temple', '供奉玄奘法師舍利的寺廟', taiwan_id, nantou_id, '寺廟', '南投縣魚池鄉中正路389號', 23.8500, 120.9278, 45, true, 79),
  ('慈恩塔', 'Ci En Pagoda', '日月潭最高點，可俯瞰整個湖景', taiwan_id, nantou_id, '地標', '南投縣魚池鄉環湖公路', 23.8522, 120.9292, 60, true, 80),
  ('集集火車站', 'Jiji Station', '古老的檜木火車站，921地震後重建', taiwan_id, nantou_id, '歷史', '南投縣集集鎮民生路75號', 23.8289, 120.7847, 45, true, 81),
  ('集集綠色隧道', 'Jiji Green Tunnel', '兩旁樟樹形成的綠蔭大道', taiwan_id, nantou_id, '自然', '南投縣集集鎮152縣道', 23.8333, 120.7667, 30, true, 82),
  ('車埕車站', 'Checheng Station', '集集線終點站，舊時木材集散地', taiwan_id, nantou_id, '歷史', '南投縣水里鄉車埕村民權巷2號', 23.8336, 120.8653, 90, true, 83),
  ('武嶺', 'Wuling', '台灣公路最高點，海拔3275公尺', taiwan_id, nantou_id, '自然', '南投縣仁愛鄉台14甲線', 24.1378, 121.2750, 30, true, 84),
  ('奧萬大國家森林遊樂區', 'Aowanda National Forest Recreation Area', '賞楓聖地，秋季楓紅美不勝收', taiwan_id, nantou_id, '自然', '南投縣仁愛鄉親愛村大安路153號', 24.0297, 121.1772, 240, true, 85),
  ('杉林溪森林生態渡假園區', 'Shanlinxi Forest Recreation Area', '四季花卉與天然森林浴', taiwan_id, nantou_id, '自然', '南投縣竹山鎮大鞍里溪山路6號', 23.6361, 120.7903, 240, true, 86),
  ('紙教堂', 'Paper Dome', '921震災後由日本移築來台的紙管教堂', taiwan_id, nantou_id, '地標', '南投縣埔里鎮桃米里桃米巷52-12號', 23.9408, 120.9389, 60, true, 87),
  ('埔里酒廠', 'Puli Winery', '台灣紹興酒發源地，有觀光工廠', taiwan_id, nantou_id, '體驗', '南投縣埔里鎮中山路三段219號', 23.9689, 120.9611, 60, true, 88),
  ('中台禪寺', 'Chung Tai Chan Monastery', '宏偉現代化佛教寺院，建築獨特', taiwan_id, nantou_id, '寺廟', '南投縣埔里鎮中台路1號', 23.9847, 120.9478, 90, true, 89),
  ('天空之橋', 'Skywalk', '猴探井風景區內的天空步道', taiwan_id, nantou_id, '體驗', '南投縣南投市猴探井街300號', 23.9033, 120.6386, 60, true, 90),
  ('鳳凰谷鳥園', 'Phoenix Valley Bird Park', '國立自然科學博物館分館，珍稀鳥類', taiwan_id, nantou_id, '體驗', '南投縣鹿谷鄉鳳凰村仁義路1-9號', 23.7253, 120.7867, 180, true, 91),
  ('日月老茶廠', 'Sun Moon Lake Tea Factory', '日治時期紅茶廠，有機茶園體驗', taiwan_id, nantou_id, '體驗', '南投縣魚池鄉有水巷38號', 23.8775, 120.9081, 60, true, 92),
  ('清境小瑞士花園', 'Little Swiss Garden', '歐風花園造景，四季花卉綻放', taiwan_id, nantou_id, '體驗', '南投縣仁愛鄉定遠新村28號', 24.0558, 121.1639, 90, true, 93),
  ('青青草原', 'Qingqing Grassland', '清境農場主要景區，綿羊秀表演場地', taiwan_id, nantou_id, '體驗', '南投縣仁愛鄉仁和路170號', 24.0597, 121.1647, 120, true, 94),
  ('廬山溫泉', 'Lushan Hot Springs', '中部知名溫泉區，群山環繞', taiwan_id, nantou_id, '溫泉', '南投縣仁愛鄉精英村榮華巷', 24.0233, 121.1833, 150, true, 95);

  RAISE NOTICE '已新增更多花蓮、南投景點資料';
END $$;
