-- ================================================
-- 新增 regions 表格（地區管理）
-- 日期: 2025-01-21
-- 目的: 支援國家和城市的統一管理
-- ================================================

-- 1. 建立 regions 表格
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('country', 'city')),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  country_code TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 軟刪除欄位（配合離線架構）
  _deleted BOOLEAN DEFAULT false,
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMPTZ
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_status ON regions(status);
CREATE INDEX IF NOT EXISTS idx_regions_country_code ON regions(country_code);
CREATE INDEX IF NOT EXISTS idx_regions_deleted ON regions(_deleted);

-- 3. 建立註解
COMMENT ON TABLE regions IS '地區管理（國家和城市）';
COMMENT ON COLUMN regions.type IS '類型：country（國家）或 city（城市）';
COMMENT ON COLUMN regions.name IS '地區名稱（例如：日本、東京）';
COMMENT ON COLUMN regions.code IS '地區代碼（例如：JPN、TYO）';
COMMENT ON COLUMN regions.status IS '狀態：active（啟用）或 inactive（停用）';
COMMENT ON COLUMN regions.country_code IS '所屬國家代碼（城市才有）';
COMMENT ON COLUMN regions._deleted IS '軟刪除標記';
COMMENT ON COLUMN regions._needs_sync IS '待同步標記（離線架構用）';
COMMENT ON COLUMN regions._synced_at IS '最後同步時間';

-- 4. 建立自動更新 updated_at 的觸發器
DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 啟用 RLS (Row Level Security)
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 6. 建立 RLS 政策（允許所有認證用戶完整存取）
DROP POLICY IF EXISTS "Allow authenticated users full access to regions" ON regions;
CREATE POLICY "Allow authenticated users full access to regions"
  ON regions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. 驗證表格建立
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'regions') THEN
    RAISE NOTICE '✅ regions 表格已建立';
  ELSE
    RAISE EXCEPTION '❌ regions 表格建立失敗';
  END IF;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Regions 表格建立完成！';
  RAISE NOTICE '====================================';
END $$;
