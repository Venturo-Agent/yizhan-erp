-- 創建顯化魔法記錄表
CREATE TABLE IF NOT EXISTS manifestation_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES employees(id) NOT NULL,
  chapter_number INTEGER NOT NULL CHECK (chapter_number >= 1 AND chapter_number <= 15),

  -- 章節內容欄位
  desire TEXT, -- 願望內容
  body_sensations TEXT[], -- 體感記錄（可多個）
  dialogue TEXT, -- 與渴望的對話
  small_action TEXT, -- 小行動
  gratitude TEXT, -- 感恩
  magic_phrases TEXT[], -- 魔法語（可多個）
  vision_board JSONB, -- 願景板（JSON 格式儲存圖片、文字等）
  shared_wish TEXT, -- 分享的願望
  notes TEXT, -- 其他筆記

  -- 完成狀態
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_manifestation_user ON manifestation_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_chapter ON manifestation_entries(chapter_number);
CREATE INDEX IF NOT EXISTS idx_manifestation_user_chapter ON manifestation_entries(user_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_manifestation_created_at ON manifestation_entries(created_at DESC);

-- 創建更新時間戳記的觸發器
CREATE OR REPLACE FUNCTION update_manifestation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manifestation_updated_at
  BEFORE UPDATE ON manifestation_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_manifestation_updated_at();

-- 創建用於查詢用戶進度的視圖
CREATE OR REPLACE VIEW manifestation_user_progress AS
SELECT
  user_id,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE is_completed = TRUE) as completed_entries,
  ARRAY_AGG(DISTINCT chapter_number ORDER BY chapter_number) as chapters_started,
  MAX(updated_at) as last_activity
FROM manifestation_entries
GROUP BY user_id;

-- 禁用 RLS（Venturo 不使用 RLS，改用前端過濾）
ALTER TABLE manifestation_entries DISABLE ROW LEVEL SECURITY;

-- 註釋說明
COMMENT ON TABLE manifestation_entries IS '顯化魔法練習記錄表';
COMMENT ON COLUMN manifestation_entries.chapter_number IS '章節編號 (1-15)';
COMMENT ON COLUMN manifestation_entries.desire IS '用戶的願望或渴望';
COMMENT ON COLUMN manifestation_entries.body_sensations IS '練習時的體感記錄';
COMMENT ON COLUMN manifestation_entries.dialogue IS '與內在渴望的對話';
COMMENT ON COLUMN manifestation_entries.small_action IS '願意採取的小行動';
COMMENT ON COLUMN manifestation_entries.gratitude IS '感恩記錄';
COMMENT ON COLUMN manifestation_entries.magic_phrases IS '個人化的魔法語';
COMMENT ON COLUMN manifestation_entries.vision_board IS '願景板內容 (JSON)';
COMMENT ON COLUMN manifestation_entries.shared_wish IS '分享到願望之牆的願望';
COMMENT ON COLUMN manifestation_entries.is_completed IS '該章節是否已完成';
