-- ================================================
-- 新增 itineraries 表格（行程表管理）
-- 日期: 2025-01-22
-- 目的: 獨立管理行程表資料（與 Tour 分離）
-- ================================================

-- 1. 建立 itineraries 表格
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- 行程編號 (如: I20240001)
  tour_id UUID,  -- 關聯的團 ID（選填，可能只是草稿）

  -- 封面資訊
  tagline TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  departure_date TEXT NOT NULL,  -- 儲存為 ISO 8601 字串
  tour_code TEXT NOT NULL,  -- 團號（可能與 code 不同）
  cover_image TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '草稿' CHECK (status IN ('草稿', '已發布')),

  -- 航班資訊 (JSONB)
  outbound_flight JSONB,
  return_flight JSONB,

  -- 行程特色 (JSONB Array)
  features JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 精選景點 (JSONB Array)
  focus_cards JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 領隊資訊 (JSONB)
  leader JSONB,

  -- 集合資訊 (JSONB)
  meeting_info JSONB,

  -- 行程副標題
  itinerary_subtitle TEXT,

  -- 逐日行程 (JSONB Array)
  daily_itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 軟刪除欄位（配合離線架構）
  _deleted BOOLEAN DEFAULT false,
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMPTZ
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_itineraries_code ON itineraries(code);
CREATE INDEX IF NOT EXISTS idx_itineraries_tour_id ON itineraries(tour_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
CREATE INDEX IF NOT EXISTS idx_itineraries_country ON itineraries(country);
CREATE INDEX IF NOT EXISTS idx_itineraries_city ON itineraries(city);
CREATE INDEX IF NOT EXISTS idx_itineraries_departure_date ON itineraries(departure_date);
CREATE INDEX IF NOT EXISTS idx_itineraries_deleted ON itineraries(_deleted);

-- 3. 建立註解
COMMENT ON TABLE itineraries IS '行程表管理（詳細的每日行程內容）';
COMMENT ON COLUMN itineraries.code IS '行程編號（如: I20240001）';
COMMENT ON COLUMN itineraries.tour_id IS '關聯的團 ID（選填）';
COMMENT ON COLUMN itineraries.tagline IS '標語（如: Corner Travel 2025）';
COMMENT ON COLUMN itineraries.title IS '行程標題（如: 漫遊福岡）';
COMMENT ON COLUMN itineraries.subtitle IS '副標題（如: 半自由行）';
COMMENT ON COLUMN itineraries.description IS '行程描述';
COMMENT ON COLUMN itineraries.departure_date IS '出發日期（ISO 8601 格式）';
COMMENT ON COLUMN itineraries.tour_code IS '團號（如: 25JFO21CIG）';
COMMENT ON COLUMN itineraries.cover_image IS '封面圖片 URL';
COMMENT ON COLUMN itineraries.country IS '國家（如: 日本）';
COMMENT ON COLUMN itineraries.city IS '城市（如: 福岡）';
COMMENT ON COLUMN itineraries.status IS '狀態：草稿或已發布';
COMMENT ON COLUMN itineraries.outbound_flight IS '去程航班資訊（JSONB）';
COMMENT ON COLUMN itineraries.return_flight IS '回程航班資訊（JSONB）';
COMMENT ON COLUMN itineraries.features IS '行程特色列表（JSONB Array）';
COMMENT ON COLUMN itineraries.focus_cards IS '精選景點列表（JSONB Array）';
COMMENT ON COLUMN itineraries.leader IS '領隊資訊（JSONB）';
COMMENT ON COLUMN itineraries.meeting_info IS '集合資訊（JSONB）';
COMMENT ON COLUMN itineraries.itinerary_subtitle IS '行程副標題';
COMMENT ON COLUMN itineraries.daily_itinerary IS '逐日行程列表（JSONB Array）';
COMMENT ON COLUMN itineraries._deleted IS '軟刪除標記';
COMMENT ON COLUMN itineraries._needs_sync IS '待同步標記（離線架構用）';
COMMENT ON COLUMN itineraries._synced_at IS '最後同步時間';

-- 4. 建立自動更新 updated_at 的觸發器
DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 啟用 RLS (Row Level Security)
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- 6. 建立 RLS 政策（允許所有認證用戶完整存取）
DROP POLICY IF EXISTS "Allow authenticated users full access to itineraries" ON itineraries;
CREATE POLICY "Allow authenticated users full access to itineraries"
  ON itineraries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. 驗證表格建立
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'itineraries') THEN
    RAISE NOTICE '✅ itineraries 表格已建立';
  ELSE
    RAISE EXCEPTION '❌ itineraries 表格建立失敗';
  END IF;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Itineraries 表格建立完成！';
  RAISE NOTICE '====================================';
END $$;
