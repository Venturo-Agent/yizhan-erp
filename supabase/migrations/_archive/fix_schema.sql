-- ================================================
-- Venturo Schema 修正腳本
-- 日期: 2025-01-21
-- 目的: 修正前端需要但 Supabase 缺少的表格和欄位
-- ================================================

-- ================================================
-- 1. 新增缺少的表格
-- ================================================

-- 1.1 tour_addons（團體加購項目）
CREATE TABLE IF NOT EXISTS tour_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_addons_tour_id ON tour_addons(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_addons_is_active ON tour_addons(is_active);

-- 註解
COMMENT ON TABLE tour_addons IS '團體加購項目';
COMMENT ON COLUMN tour_addons.tour_id IS '關聯的旅遊團ID';
COMMENT ON COLUMN tour_addons.name IS '加購項目名稱';
COMMENT ON COLUMN tour_addons.price IS '加購項目價格';

-- ================================================

-- 1.2 tour_refunds（團體退費項目）
CREATE TABLE IF NOT EXISTS tour_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  member_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '申請中' CHECK (status IN ('申請中', '已核准', '已退款', '已拒絕')),
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  processed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_refunds_tour_id ON tour_refunds(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_refunds_order_id ON tour_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_tour_refunds_status ON tour_refunds(status);

-- 註解
COMMENT ON TABLE tour_refunds IS '團體退費項目';
COMMENT ON COLUMN tour_refunds.tour_id IS '關聯的旅遊團ID';
COMMENT ON COLUMN tour_refunds.order_id IS '關聯的訂單ID';
COMMENT ON COLUMN tour_refunds.status IS '退費狀態：申請中、已核准、已退款、已拒絕';

-- ================================================
-- 2. 新增缺少的欄位
-- ================================================

-- 2.1 members 表新增 tour_id（重要！直接關聯旅遊團）
ALTER TABLE members ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tours(id) ON DELETE CASCADE;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_members_tour_id ON members(tour_id);

-- 註解
COMMENT ON COLUMN members.tour_id IS '直接關聯的旅遊團ID（避免每次都要透過 order_id 查詢）';

-- 更新既有資料的 tour_id（從 orders 表取得）
UPDATE members m
SET tour_id = o.tour_id
FROM orders o
WHERE m.order_id = o.id
  AND m.tour_id IS NULL;

-- ================================================

-- 2.2 tours 表新增 archived（封存旗標）
ALTER TABLE tours ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- 建立索引（方便查詢未封存的旅遊團）
CREATE INDEX IF NOT EXISTS idx_tours_archived ON tours(archived);

-- 註解
COMMENT ON COLUMN tours.archived IS '是否已封存（封存的旅遊團不會顯示在一般列表中）';

-- ================================================
-- 3. 自動更新 updated_at 觸發器
-- ================================================

-- 3.1 建立觸發器函數（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2 為新表格建立觸發器
DROP TRIGGER IF EXISTS update_tour_addons_updated_at ON tour_addons;
CREATE TRIGGER update_tour_addons_updated_at
  BEFORE UPDATE ON tour_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tour_refunds_updated_at ON tour_refunds;
CREATE TRIGGER update_tour_refunds_updated_at
  BEFORE UPDATE ON tour_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 4. RLS (Row Level Security) 政策
-- ================================================

-- 4.1 啟用 RLS
ALTER TABLE tour_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_refunds ENABLE ROW LEVEL SECURITY;

-- 4.2 建立政策（允許所有認證用戶完整存取）
-- 注意：實際使用時應該根據業務需求調整權限

-- tour_addons 政策
DROP POLICY IF EXISTS "Allow authenticated users full access to tour_addons" ON tour_addons;
CREATE POLICY "Allow authenticated users full access to tour_addons"
  ON tour_addons
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- tour_refunds 政策
DROP POLICY IF EXISTS "Allow authenticated users full access to tour_refunds" ON tour_refunds;
CREATE POLICY "Allow authenticated users full access to tour_refunds"
  ON tour_refunds
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 5. 驗證腳本執行結果
-- ================================================

DO $$
BEGIN
  -- 檢查表格是否存在
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tour_addons') THEN
    RAISE NOTICE '✅ tour_addons 表格已建立';
  ELSE
    RAISE EXCEPTION '❌ tour_addons 表格建立失敗';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tour_refunds') THEN
    RAISE NOTICE '✅ tour_refunds 表格已建立';
  ELSE
    RAISE EXCEPTION '❌ tour_refunds 表格建立失敗';
  END IF;

  -- 檢查欄位是否存在
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'members'
      AND column_name = 'tour_id'
  ) THEN
    RAISE NOTICE '✅ members.tour_id 欄位已新增';
  ELSE
    RAISE EXCEPTION '❌ members.tour_id 欄位新增失敗';
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tours'
      AND column_name = 'archived'
  ) THEN
    RAISE NOTICE '✅ tours.archived 欄位已新增';
  ELSE
    RAISE EXCEPTION '❌ tours.archived 欄位新增失敗';
  END IF;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Schema 修正完成！';
  RAISE NOTICE '====================================';
END $$;

-- ================================================
-- 6. 統計資訊
-- ================================================

-- 顯示新表格的統計
SELECT
  'tour_addons' as table_name,
  COUNT(*) as row_count
FROM tour_addons
UNION ALL
SELECT
  'tour_refunds' as table_name,
  COUNT(*) as row_count
FROM tour_refunds;

-- 顯示更新的 members 資料統計
SELECT
  COUNT(*) as total_members,
  COUNT(tour_id) as members_with_tour_id,
  COUNT(*) - COUNT(tour_id) as members_without_tour_id
FROM members;
