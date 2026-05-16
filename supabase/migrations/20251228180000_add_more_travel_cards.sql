-- 新增更多旅遊便利小卡
-- 飯店、交通、購物、緊急、日常、特殊需求

BEGIN;

INSERT INTO public.travel_card_templates (category, code, icon, label_zh, translations, sort_order) VALUES

-- ============================================
-- 飯店相關 (70-89)
-- ============================================
('hotel', 'extra_towel', '🛁', '請多給我毛巾', '{"ja": "タオルを追加でください", "en": "Extra towels please", "ko": "수건 더 주세요", "th": "ขอผ้าเช็ดตัวเพิ่ม"}', 70),
('hotel', 'extra_pillow', '🛏️', '請多給我枕頭', '{"ja": "枕を追加でください", "en": "Extra pillows please", "ko": "베개 더 주세요", "th": "ขอหมอนเพิ่ม"}', 71),
('hotel', 'extra_blanket', '🛋️', '請多給我被子', '{"ja": "毛布を追加でください", "en": "Extra blanket please", "ko": "이불 더 주세요", "th": "ขอผ้าห่มเพิ่ม"}', 72),
('hotel', 'room_cleaning', '🧹', '請打掃房間', '{"ja": "部屋を掃除してください", "en": "Please clean the room", "ko": "방 청소해 주세요", "th": "กรุณาทำความสะอาดห้อง"}', 73),
('hotel', 'no_cleaning', '🚫', '今天不用打掃', '{"ja": "今日は掃除不要です", "en": "No cleaning today", "ko": "오늘은 청소 안 해도 돼요", "th": "วันนี้ไม่ต้องทำความสะอาด"}', 74),
('hotel', 'late_checkout', '⏰', '我想延遲退房', '{"ja": "レイトチェックアウトをお願いします", "en": "Late checkout please", "ko": "늦은 체크아웃 부탁드려요", "th": "ขอเช็คเอาท์ช้า"}', 75),
('hotel', 'early_checkin', '⏰', '我想提早入住', '{"ja": "アーリーチェックインをお願いします", "en": "Early check-in please", "ko": "일찍 체크인 부탁드려요", "th": "ขอเช็คอินเร็ว"}', 76),
('hotel', 'luggage_storage', '🧳', '可以寄放行李嗎？', '{"ja": "荷物を預かってもらえますか？", "en": "Can you store my luggage?", "ko": "짐 맡길 수 있나요?", "th": "ฝากกระเป๋าได้ไหม?"}', 77),
('hotel', 'wake_up_call', '⏰', '請明早叫我起床', '{"ja": "モーニングコールをお願いします", "en": "Wake-up call please", "ko": "모닝콜 부탁드려요", "th": "ขอโทรปลุกตอนเช้า"}', 78),
('hotel', 'hot_water_issue', '🚿', '熱水不夠熱', '{"ja": "お湯がぬるいです", "en": "Hot water is not hot enough", "ko": "온수가 안 나와요", "th": "น้ำร้อนไม่ร้อน"}', 79),
('hotel', 'ac_broken', '❄️', '冷氣壞了', '{"ja": "エアコンが壊れています", "en": "The AC is broken", "ko": "에어컨이 고장났어요", "th": "แอร์เสีย"}', 80),
('hotel', 'wifi_issue', '📶', 'WiFi 連不上', '{"ja": "WiFiに繋がりません", "en": "WiFi is not working", "ko": "와이파이가 안 돼요", "th": "WiFi ใช้ไม่ได้"}', 81),
('hotel', 'room_too_noisy', '🔊', '房間太吵了', '{"ja": "部屋がうるさいです", "en": "The room is too noisy", "ko": "방이 너무 시끄러워요", "th": "ห้องเสียงดังเกินไป"}', 82),
('hotel', 'change_room', '🔄', '可以換房間嗎？', '{"ja": "部屋を変えてもらえますか？", "en": "Can I change rooms?", "ko": "방 바꿀 수 있나요?", "th": "ขอเปลี่ยนห้องได้ไหม?"}', 83),

-- ============================================
-- 交通相關 (100-119)
-- ============================================
('transport', 'go_to_hotel', '🏨', '請載我去這間飯店', '{"ja": "このホテルまでお願いします", "en": "Please take me to this hotel", "ko": "이 호텔로 가주세요", "th": "ไปโรงแรมนี้"}', 100),
('transport', 'go_to_airport', '✈️', '請載我去機場', '{"ja": "空港までお願いします", "en": "To the airport please", "ko": "공항으로 가주세요", "th": "ไปสนามบิน"}', 101),
('transport', 'go_to_station', '🚉', '請載我去車站', '{"ja": "駅までお願いします", "en": "To the station please", "ko": "역으로 가주세요", "th": "ไปสถานีรถไฟ"}', 102),
('transport', 'go_to_address', '📍', '請載我去這個地址', '{"ja": "この住所までお願いします", "en": "Please take me to this address", "ko": "이 주소로 가주세요", "th": "ไปที่อยู่นี้"}', 103),
('transport', 'how_much_fare', '💰', '到那裡多少錢？', '{"ja": "そこまでいくらですか？", "en": "How much to get there?", "ko": "거기까지 얼마예요?", "th": "ไปที่นั่นเท่าไหร่?"}', 104),
('transport', 'receipt_please', '🧾', '請給我收據', '{"ja": "領収書をください", "en": "Receipt please", "ko": "영수증 주세요", "th": "ขอใบเสร็จ"}', 105),
('transport', 'stop_here', '✋', '請在這裡停車', '{"ja": "ここで止めてください", "en": "Stop here please", "ko": "여기서 세워주세요", "th": "จอดที่นี่"}', 106),
('transport', 'wait_here', '⏳', '請在這裡等我', '{"ja": "ここで待っていてください", "en": "Please wait here", "ko": "여기서 기다려 주세요", "th": "รอที่นี่"}', 107),
('transport', 'turn_on_meter', '🔢', '請開錶', '{"ja": "メーターを使ってください", "en": "Please use the meter", "ko": "미터기 켜주세요", "th": "เปิดมิเตอร์"}', 108),
('transport', 'no_toll_road', '🛣️', '不要走收費道路', '{"ja": "有料道路は使わないでください", "en": "No toll roads please", "ko": "유료도로 안 가도 돼요", "th": "ไม่ใช้ทางด่วน"}', 109),

-- ============================================
-- 購物相關 (120-139)
-- ============================================
('shopping', 'tax_free', '💳', '可以免稅嗎？', '{"ja": "免税できますか？", "en": "Is tax-free available?", "ko": "면세 되나요?", "th": "ขอคืนภาษีได้ไหม?"}', 120),
('shopping', 'try_on', '👕', '可以試穿嗎？', '{"ja": "試着できますか？", "en": "Can I try this on?", "ko": "입어봐도 되나요?", "th": "ลองได้ไหม?"}', 121),
('shopping', 'other_size', '📏', '有其他尺寸嗎？', '{"ja": "他のサイズはありますか？", "en": "Do you have other sizes?", "ko": "다른 사이즈 있나요?", "th": "มีไซส์อื่นไหม?"}', 122),
('shopping', 'size_bigger', '⬆️', '有大一點的嗎？', '{"ja": "もっと大きいのはありますか？", "en": "Do you have a bigger size?", "ko": "더 큰 거 있나요?", "th": "มีใหญ่กว่านี้ไหม?"}', 123),
('shopping', 'size_smaller', '⬇️', '有小一點的嗎？', '{"ja": "もっと小さいのはありますか？", "en": "Do you have a smaller size?", "ko": "더 작은 거 있나요?", "th": "มีเล็กกว่านี้ไหม?"}', 124),
('shopping', 'other_color', '🎨', '有其他顏色嗎？', '{"ja": "他の色はありますか？", "en": "Do you have other colors?", "ko": "다른 색 있나요?", "th": "มีสีอื่นไหม?"}', 125),
('shopping', 'how_much', '💰', '這個多少錢？', '{"ja": "これはいくらですか？", "en": "How much is this?", "ko": "이거 얼마예요?", "th": "อันนี้เท่าไหร่?"}', 126),
('shopping', 'can_discount', '💸', '可以便宜一點嗎？', '{"ja": "安くなりますか？", "en": "Can you give a discount?", "ko": "깎아주세요", "th": "ลดได้ไหม?"}', 127),
('shopping', 'pay_card', '💳', '可以刷卡嗎？', '{"ja": "カードで払えますか？", "en": "Can I pay by card?", "ko": "카드 되나요?", "th": "จ่ายบัตรได้ไหม?"}', 128),
('shopping', 'pay_cash', '💵', '我付現金', '{"ja": "現金で払います", "en": "I will pay in cash", "ko": "현금으로 할게요", "th": "จ่ายเงินสด"}', 129),
('shopping', 'just_looking', '👀', '我只是看看', '{"ja": "見ているだけです", "en": "Just looking", "ko": "그냥 구경하는 거예요", "th": "แค่ดูเฉยๆ"}', 130),
('shopping', 'wrap_gift', '🎁', '可以包裝嗎？', '{"ja": "ギフト包装できますか？", "en": "Can you gift wrap it?", "ko": "포장해 주세요", "th": "ห่อของขวัญได้ไหม?"}', 131),
('shopping', 'separate_bag', '🛍️', '請分開裝袋', '{"ja": "別々の袋に入れてください", "en": "Separate bags please", "ko": "따로 담아주세요", "th": "แยกถุงให้หน่อย"}', 132),

-- ============================================
-- 餐廳相關 (140-159)
-- ============================================
('restaurant', 'table_for_x', '🍽️', '我們有X位', '{"ja": "X名です", "en": "Table for X please", "ko": "X명이요", "th": "X ที่นั่ง"}', 140),
('restaurant', 'reservation', '📅', '我有預約', '{"ja": "予約しています", "en": "I have a reservation", "ko": "예약했어요", "th": "จองไว้แล้ว"}', 141),
('restaurant', 'menu_please', '📖', '請給我菜單', '{"ja": "メニューをください", "en": "Menu please", "ko": "메뉴판 주세요", "th": "ขอเมนู"}', 142),
('restaurant', 'recommend', '⭐', '有推薦的嗎？', '{"ja": "おすすめは何ですか？", "en": "What do you recommend?", "ko": "추천 메뉴 뭐예요?", "th": "แนะนำอะไร?"}', 143),
('restaurant', 'order_same', '👆', '我要跟他一樣的', '{"ja": "同じものをください", "en": "Same as theirs please", "ko": "저것과 같은 거요", "th": "เอาเหมือนเขา"}', 144),
('restaurant', 'water_please', '💧', '請給我水', '{"ja": "お水をください", "en": "Water please", "ko": "물 주세요", "th": "ขอน้ำ"}', 145),
('restaurant', 'bill_please', '🧾', '請結帳', '{"ja": "お会計をお願いします", "en": "Bill please", "ko": "계산해 주세요", "th": "เก็บเงิน"}', 146),
('restaurant', 'pay_together', '💰', '一起結帳', '{"ja": "一緒に会計します", "en": "Pay together", "ko": "같이 계산할게요", "th": "จ่ายรวม"}', 147),
('restaurant', 'pay_separate', '💰', '分開結帳', '{"ja": "別々に会計します", "en": "Separate bills", "ko": "따로 계산해 주세요", "th": "จ่ายแยก"}', 148),
('restaurant', 'take_away', '📦', '我要外帶', '{"ja": "持ち帰りでお願いします", "en": "To go please", "ko": "포장해 주세요", "th": "ห่อกลับ"}', 149),
('restaurant', 'eat_here', '🪑', '我要內用', '{"ja": "店内で食べます", "en": "For here please", "ko": "여기서 먹을게요", "th": "ทานที่นี่"}', 150),
('restaurant', 'less_ice', '🧊', '少冰', '{"ja": "氷少なめで", "en": "Less ice please", "ko": "얼음 적게요", "th": "น้ำแข็งน้อย"}', 151),
('restaurant', 'no_ice', '🧊', '去冰', '{"ja": "氷なしで", "en": "No ice please", "ko": "얼음 빼주세요", "th": "ไม่ใส่น้ำแข็ง"}', 152),
('restaurant', 'less_sugar', '🍬', '少糖', '{"ja": "砂糖少なめで", "en": "Less sugar please", "ko": "덜 달게요", "th": "หวานน้อย"}', 153),
('restaurant', 'no_sugar', '🍬', '無糖', '{"ja": "砂糖なしで", "en": "No sugar please", "ko": "설탕 빼주세요", "th": "ไม่หวาน"}', 154),

-- ============================================
-- 緊急求助 (160-179)
-- ============================================
('emergency', 'need_help', '🆘', '我需要幫助', '{"ja": "助けてください", "en": "I need help", "ko": "도와주세요", "th": "ช่วยด้วย"}', 160),
('emergency', 'call_police', '🚔', '請幫我報警', '{"ja": "警察を呼んでください", "en": "Please call the police", "ko": "경찰 불러주세요", "th": "เรียกตำรวจ"}', 161),
('emergency', 'call_ambulance', '🚑', '請叫救護車', '{"ja": "救急車を呼んでください", "en": "Please call an ambulance", "ko": "구급차 불러주세요", "th": "เรียกรถพยาบาล"}', 162),
('emergency', 'lost_passport', '📕', '我的護照不見了', '{"ja": "パスポートをなくしました", "en": "I lost my passport", "ko": "여권을 잃어버렸어요", "th": "หนังสือเดินทางหาย"}', 163),
('emergency', 'lost_wallet', '👛', '我的錢包不見了', '{"ja": "財布をなくしました", "en": "I lost my wallet", "ko": "지갑을 잃어버렸어요", "th": "กระเป๋าสตางค์หาย"}', 164),
('emergency', 'lost_phone', '📱', '我的手機不見了', '{"ja": "携帯をなくしました", "en": "I lost my phone", "ko": "핸드폰을 잃어버렸어요", "th": "โทรศัพท์หาย"}', 165),
('emergency', 'feel_sick', '🤒', '我身體不舒服', '{"ja": "気分が悪いです", "en": "I feel sick", "ko": "몸이 안 좋아요", "th": "ไม่สบาย"}', 166),
('emergency', 'need_hospital', '🏥', '我需要去醫院', '{"ja": "病院に行きたいです", "en": "I need to go to a hospital", "ko": "병원에 가야 해요", "th": "ต้องไปโรงพยาบาล"}', 167),
('emergency', 'pharmacy_where', '💊', '藥局在哪裡？', '{"ja": "薬局はどこですか？", "en": "Where is a pharmacy?", "ko": "약국 어디예요?", "th": "ร้านขายยาอยู่ไหน?"}', 168),
('emergency', 'embassy_where', '🏛️', '大使館在哪裡？', '{"ja": "大使館はどこですか？", "en": "Where is the embassy?", "ko": "대사관 어디예요?", "th": "สถานทูตอยู่ไหน?"}', 169),
('emergency', 'been_robbed', '😰', '我被搶劫了', '{"ja": "強盗に遭いました", "en": "I have been robbed", "ko": "강도당했어요", "th": "ถูกปล้น"}', 170),

-- ============================================
-- 日常溝通 (180-199)
-- ============================================
('daily', 'thank_you', '🙏', '謝謝', '{"ja": "ありがとうございます", "en": "Thank you", "ko": "감사합니다", "th": "ขอบคุณ"}', 180),
('daily', 'sorry', '🙇', '對不起', '{"ja": "すみません", "en": "Sorry", "ko": "죄송합니다", "th": "ขอโทษ"}', 181),
('daily', 'excuse_me', '👋', '不好意思（借過）', '{"ja": "すみません（通ります）", "en": "Excuse me", "ko": "잠시만요", "th": "ขอทางหน่อย"}', 182),
('daily', 'no_understand', '❓', '我聽不懂', '{"ja": "わかりません", "en": "I don''t understand", "ko": "못 알아들었어요", "th": "ไม่เข้าใจ"}', 183),
('daily', 'speak_slowly', '🐢', '請說慢一點', '{"ja": "ゆっくり話してください", "en": "Please speak slowly", "ko": "천천히 말해주세요", "th": "พูดช้าๆ หน่อย"}', 184),
('daily', 'write_please', '✍️', '請寫下來給我看', '{"ja": "書いてください", "en": "Please write it down", "ko": "적어주세요", "th": "เขียนให้ดูหน่อย"}', 185),
('daily', 'photo_ok', '📸', '可以拍照嗎？', '{"ja": "写真を撮ってもいいですか？", "en": "Can I take a photo?", "ko": "사진 찍어도 되나요?", "th": "ถ่ายรูปได้ไหม?"}', 186),
('daily', 'photo_help', '🤳', '可以幫我拍照嗎？', '{"ja": "写真を撮ってもらえますか？", "en": "Can you take my photo?", "ko": "사진 찍어주세요", "th": "ถ่ายรูปให้หน่อย"}', 187),
('daily', 'bathroom_where', '🚻', '廁所在哪裡？', '{"ja": "トイレはどこですか？", "en": "Where is the bathroom?", "ko": "화장실 어디예요?", "th": "ห้องน้ำอยู่ไหน?"}', 188),
('daily', 'how_to_go', '🗺️', '要怎麼去？', '{"ja": "どうやって行きますか？", "en": "How do I get there?", "ko": "어떻게 가요?", "th": "ไปยังไง?"}', 189),
('daily', 'how_long', '⏱️', '要多久？', '{"ja": "どのくらいかかりますか？", "en": "How long does it take?", "ko": "얼마나 걸려요?", "th": "ใช้เวลานานไหม?"}', 190),
('daily', 'what_time_close', '🕐', '幾點關門？', '{"ja": "何時に閉まりますか？", "en": "What time do you close?", "ko": "몇 시에 닫아요?", "th": "ปิดกี่โมง?"}', 191),
('daily', 'what_time_open', '🕐', '幾點開門？', '{"ja": "何時に開きますか？", "en": "What time do you open?", "ko": "몇 시에 열어요?", "th": "เปิดกี่โมง?"}', 192),
('daily', 'yes', '✅', '是/好的', '{"ja": "はい", "en": "Yes", "ko": "네", "th": "ใช่"}', 193),
('daily', 'no', '❌', '不是/不要', '{"ja": "いいえ", "en": "No", "ko": "아니요", "th": "ไม่"}', 194),

-- ============================================
-- 特殊需求 (200-219)
-- ============================================
('special', 'baby_chair', '👶', '有兒童座椅嗎？', '{"ja": "子供用の椅子はありますか？", "en": "Do you have a baby chair?", "ko": "아기 의자 있나요?", "th": "มีเก้าอี้เด็กไหม?"}', 200),
('special', 'baby_bed', '🛏️', '有嬰兒床嗎？', '{"ja": "ベビーベッドはありますか？", "en": "Do you have a baby crib?", "ko": "아기 침대 있나요?", "th": "มีเตียงเด็กไหม?"}', 201),
('special', 'stroller_ok', '🚼', '可以推嬰兒車嗎？', '{"ja": "ベビーカーで入れますか？", "en": "Are strollers allowed?", "ko": "유모차 가능한가요?", "th": "เข็นรถเด็กได้ไหม?"}', 202),
('special', 'breastfeed_room', '🍼', '有哺乳室嗎？', '{"ja": "授乳室はありますか？", "en": "Is there a nursing room?", "ko": "수유실 있나요?", "th": "มีห้องให้นมไหม?"}', 203),
('special', 'elevator_where', '🛗', '電梯在哪裡？', '{"ja": "エレベーターはどこですか？", "en": "Where is the elevator?", "ko": "엘리베이터 어디예요?", "th": "ลิฟต์อยู่ไหน?"}', 204),
('special', 'pregnant', '🤰', '我懷孕了', '{"ja": "妊娠しています", "en": "I am pregnant", "ko": "임신 중이에요", "th": "ฉันท้อง"}', 205),
('special', 'elderly', '👴', '有年長者同行', '{"ja": "高齢者が一緒です", "en": "I have an elderly person with me", "ko": "노인이 함께 있어요", "th": "มีผู้สูงอายุมาด้วย"}', 206),
('special', 'kid_menu', '🧒', '有兒童餐嗎？', '{"ja": "お子様メニューはありますか？", "en": "Do you have a kids menu?", "ko": "아이 메뉴 있나요?", "th": "มีเมนูเด็กไหม?"}', 207),
('special', 'pet_allowed', '🐕', '可以帶寵物嗎？', '{"ja": "ペットOKですか？", "en": "Are pets allowed?", "ko": "반려동물 가능한가요?", "th": "พาสัตว์เลี้ยงได้ไหม?"}', 208)

ON CONFLICT (code) DO UPDATE SET
  translations = EXCLUDED.translations,
  label_zh = EXCLUDED.label_zh,
  icon = EXCLUDED.icon,
  updated_at = NOW();

COMMIT;
