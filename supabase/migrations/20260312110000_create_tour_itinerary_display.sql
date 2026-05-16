-- 建立 tour_itinerary_display 表
-- 目的：分離展示內容與行程資料，避免與核心表重複

CREATE TABLE IF NOT EXISTS public.tour_itinerary_display (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯
  itinerary_id text NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  
  -- 天數
  day_number integer NOT NULL,
  
  -- 展示內容（從 daily_itinerary 遷移過來）
  day_label text,              -- "Day 1", "Day 2"
  date text,                   -- "10/21 (二)"
  title text,                  -- "京都經典一日遊"
  highlight text,              -- "清水寺、金閣寺"
  description text,            -- 詳細描述
  images jsonb,                -- [{url, position}]
  recommendations text[],      -- 推薦項目清單
  
  -- 飯店展示設定（不重複核心表的住宿資料）
  accommodation_url text,      -- 飯店官網
  accommodation_rating integer, -- 飯店星級 (1-5)
  is_same_accommodation boolean DEFAULT false, -- 是否續住
  
  -- 審計
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  
  -- 約束
  CONSTRAINT valid_day_number CHECK (day_number > 0),
  CONSTRAINT valid_rating CHECK (accommodation_rating IS NULL OR (accommodation_rating >= 1 AND accommodation_rating <= 5)),
  CONSTRAINT unique_itinerary_day UNIQUE (itinerary_id, day_number)
);

-- 索引
CREATE INDEX idx_tour_itinerary_display_itinerary ON public.tour_itinerary_display(itinerary_id);
CREATE INDEX idx_tour_itinerary_display_workspace ON public.tour_itinerary_display(workspace_id);
CREATE INDEX idx_tour_itinerary_display_day ON public.tour_itinerary_display(day_number);

-- RLS
ALTER TABLE public.tour_itinerary_display ENABLE ROW LEVEL SECURITY;

CREATE POLICY tour_itinerary_display_workspace_isolation ON public.tour_itinerary_display
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id', true)::text);

-- 註解
COMMENT ON TABLE public.tour_itinerary_display IS '行程展示內容表 - 存儲每日行程的展示設定，與 tour_itinerary_items 核心表分離';
COMMENT ON COLUMN public.tour_itinerary_display.highlight IS '當日重點行程（如：清水寺、金閣寺）';
COMMENT ON COLUMN public.tour_itinerary_display.description IS '當日詳細描述';
COMMENT ON COLUMN public.tour_itinerary_display.images IS 'JSONB 陣列，格式：[{url: string, position?: string}]';
COMMENT ON COLUMN public.tour_itinerary_display.recommendations IS '推薦項目清單';
COMMENT ON COLUMN public.tour_itinerary_display.is_same_accommodation IS '是否與前一天相同住宿（續住）';
