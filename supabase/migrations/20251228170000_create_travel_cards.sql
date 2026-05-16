-- 旅遊便利小卡系統
-- 讓旅客快速展示飲食限制、過敏資訊等給當地人看

BEGIN;

-- ============================================
-- 1. 小卡類別定義表（系統預設）
-- ============================================
CREATE TABLE IF NOT EXISTS public.travel_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 類別
  category TEXT NOT NULL,  -- 'dietary', 'allergy', 'medical', 'accommodation'
  code TEXT NOT NULL UNIQUE,  -- 'no_onion', 'no_garlic', 'seafood_allergy', etc.
  icon TEXT NOT NULL,  -- emoji: 🚫, 🦐, 💊, etc.

  -- 中文（主語言）
  label_zh TEXT NOT NULL,  -- "我不吃蔥"

  -- 各國翻譯 (JSONB)
  translations JSONB NOT NULL DEFAULT '{}',
  -- 格式: { "ja": "ネギは食べられません", "en": "I don't eat onions", "ko": "파를 못 먹어요", ... }

  -- 排序
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 使用者的小卡設定
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_travel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- 關聯模板（可選，自訂卡片為 null）
  template_id UUID REFERENCES public.travel_card_templates(id) ON DELETE SET NULL,

  -- 自訂內容（如果不用模板）
  icon TEXT,  -- 自訂 emoji
  label_zh TEXT,  -- 自訂中文
  translations JSONB DEFAULT '{}',  -- 自訂翻譯

  -- 狀態
  is_active BOOLEAN DEFAULT true,  -- 是否啟用
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同一客戶不能重複選同一模板
  UNIQUE(customer_id, template_id)
);

-- ============================================
-- 3. 預設模板資料
-- ============================================
INSERT INTO public.travel_card_templates (category, code, icon, label_zh, translations, sort_order) VALUES
-- 飲食限制
('dietary', 'no_onion', '🚫', '我不吃蔥', '{"ja": "ネギは食べられません", "en": "I cannot eat green onions", "ko": "파를 못 먹어요", "th": "ฉันกินต้นหอมไม่ได้"}', 1),
('dietary', 'no_garlic', '🚫', '我不吃蒜', '{"ja": "ニンニクは食べられません", "en": "I cannot eat garlic", "ko": "마늘을 못 먹어요", "th": "ฉันกินกระเทียมไม่ได้"}', 2),
('dietary', 'no_onion_garlic', '🚫', '我不吃蔥蒜', '{"ja": "ネギとニンニクは食べられません", "en": "I cannot eat onions or garlic", "ko": "파와 마늘을 못 먹어요", "th": "ฉันกินต้นหอมและกระเทียมไม่ได้"}', 3),
('dietary', 'no_cilantro', '🚫', '我不吃香菜', '{"ja": "パクチーは食べられません", "en": "I cannot eat cilantro", "ko": "고수를 못 먹어요", "th": "ฉันกินผักชีไม่ได้"}', 4),
('dietary', 'no_spicy', '🌶️', '我不吃辣', '{"ja": "辛いものは食べられません", "en": "I cannot eat spicy food", "ko": "매운 음식을 못 먹어요", "th": "ฉันกินเผ็ดไม่ได้"}', 5),
('dietary', 'no_raw', '🍣', '我不吃生食', '{"ja": "生ものは食べられません", "en": "I cannot eat raw food", "ko": "날것을 못 먹어요", "th": "ฉันกินอาหารดิบไม่ได้"}', 6),
('dietary', 'vegetarian', '🥬', '我吃素（蛋奶素）', '{"ja": "ベジタリアンです（卵と乳製品はOK）", "en": "I am vegetarian (eggs and dairy OK)", "ko": "채식주의자입니다 (계란, 유제품 가능)", "th": "ฉันเป็นมังสวิรัติ (ไข่และนมได้)"}', 7),
('dietary', 'vegan', '🌱', '我吃全素', '{"ja": "ヴィーガンです", "en": "I am vegan", "ko": "비건입니다", "th": "ฉันเป็นวีแกน"}', 8),
('dietary', 'no_beef', '🐄', '我不吃牛肉', '{"ja": "牛肉は食べられません", "en": "I cannot eat beef", "ko": "소고기를 못 먹어요", "th": "ฉันกินเนื้อวัวไม่ได้"}', 9),
('dietary', 'no_pork', '🐷', '我不吃豬肉', '{"ja": "豚肉は食べられません", "en": "I cannot eat pork", "ko": "돼지고기를 못 먹어요", "th": "ฉันกินหมูไม่ได้"}', 10),
('dietary', 'halal', '☪️', '我只吃清真食物', '{"ja": "ハラール食のみ食べられます", "en": "I only eat Halal food", "ko": "할랄 음식만 먹어요", "th": "ฉันกินอาหารฮาลาลเท่านั้น"}', 11),

-- 過敏
('allergy', 'seafood_allergy', '🦐', '我對海鮮過敏', '{"ja": "シーフードアレルギーがあります", "en": "I have a seafood allergy", "ko": "해산물 알레르기가 있어요", "th": "ฉันแพ้อาหารทะเล"}', 20),
('allergy', 'shellfish_allergy', '🦪', '我對貝類過敏', '{"ja": "貝類アレルギーがあります", "en": "I have a shellfish allergy", "ko": "조개류 알레르기가 있어요", "th": "ฉันแพ้หอย"}', 21),
('allergy', 'nut_allergy', '🥜', '我對堅果過敏', '{"ja": "ナッツアレルギーがあります", "en": "I have a nut allergy", "ko": "견과류 알레르기가 있어요", "th": "ฉันแพ้ถั่ว"}', 22),
('allergy', 'peanut_allergy', '🥜', '我對花生過敏', '{"ja": "ピーナッツアレルギーがあります", "en": "I have a peanut allergy", "ko": "땅콩 알레르기가 있어요", "th": "ฉันแพ้ถั่วลิสง"}', 23),
('allergy', 'dairy_allergy', '🥛', '我對乳製品過敏', '{"ja": "乳製品アレルギーがあります", "en": "I have a dairy allergy", "ko": "유제품 알레르기가 있어요", "th": "ฉันแพ้นม"}', 24),
('allergy', 'egg_allergy', '🥚', '我對蛋過敏', '{"ja": "卵アレルギーがあります", "en": "I have an egg allergy", "ko": "계란 알레르기가 있어요", "th": "ฉันแพ้ไข่"}', 25),
('allergy', 'gluten_allergy', '🌾', '我對麩質過敏', '{"ja": "グルテンアレルギーがあります", "en": "I have a gluten allergy", "ko": "글루텐 알레르기가 있어요", "th": "ฉันแพ้กลูเตน"}', 26),
('allergy', 'soy_allergy', '🫘', '我對大豆過敏', '{"ja": "大豆アレルギーがあります", "en": "I have a soy allergy", "ko": "대두 알레르기가 있어요", "th": "ฉันแพ้ถั่วเหลือง"}', 27),

-- 醫療
('medical', 'diabetes', '💉', '我有糖尿病', '{"ja": "糖尿病があります", "en": "I have diabetes", "ko": "당뇨병이 있어요", "th": "ฉันเป็นเบาหวาน"}', 40),
('medical', 'heart_condition', '❤️', '我有心臟病', '{"ja": "心臓病があります", "en": "I have a heart condition", "ko": "심장병이 있어요", "th": "ฉันเป็นโรคหัวใจ"}', 41),
('medical', 'asthma', '🫁', '我有氣喘', '{"ja": "喘息があります", "en": "I have asthma", "ko": "천식이 있어요", "th": "ฉันเป็นหอบหืด"}', 42),
('medical', 'epilepsy', '⚡', '我有癲癇', '{"ja": "てんかんがあります", "en": "I have epilepsy", "ko": "간질이 있어요", "th": "ฉันเป็นลมชัก"}', 43),

-- 住宿需求
('accommodation', 'non_smoking', '🚭', '我需要禁煙房', '{"ja": "禁煙室をお願いします", "en": "I need a non-smoking room", "ko": "금연실 부탁드려요", "th": "ขอห้องปลอดบุหรี่"}', 60),
('accommodation', 'quiet_floor', '🔇', '我需要安靜樓層', '{"ja": "静かなフロアをお願いします", "en": "I need a quiet floor", "ko": "조용한 층 부탁드려요", "th": "ขอชั้นที่เงียบ"}', 61),
('accommodation', 'high_floor', '🏢', '我想要高樓層', '{"ja": "高層階をお願いします", "en": "I prefer a high floor", "ko": "높은 층 부탁드려요", "th": "ขอชั้นสูง"}', 62),
('accommodation', 'wheelchair', '♿', '我需要無障礙設施', '{"ja": "バリアフリー対応をお願いします", "en": "I need wheelchair accessibility", "ko": "휠체어 이용 가능한 곳 부탁드려요", "th": "ต้องการสิ่งอำนวยความสะดวกสำหรับรถเข็น"}', 63)

ON CONFLICT (code) DO UPDATE SET
  translations = EXCLUDED.translations,
  updated_at = NOW();

-- ============================================
-- 4. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_travel_card_templates_category ON public.travel_card_templates(category);
CREATE INDEX IF NOT EXISTS idx_customer_travel_cards_customer ON public.customer_travel_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_travel_cards_active ON public.customer_travel_cards(customer_id, is_active) WHERE is_active = true;

-- ============================================
-- 5. RLS 政策（簡化版，之後再細調）
-- ============================================
-- 模板表：公開可讀
ALTER TABLE public.travel_card_templates DISABLE ROW LEVEL SECURITY;

-- 客戶小卡：暫時關閉 RLS，由應用層控制
ALTER TABLE public.customer_travel_cards DISABLE ROW LEVEL SECURITY;

COMMIT;
