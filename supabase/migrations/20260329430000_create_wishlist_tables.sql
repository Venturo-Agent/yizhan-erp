-- 紙娃娃系統資料表

-- 1. 紙娃娃模板
CREATE TABLE IF NOT EXISTS wishlist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,           -- 清邁紙娃娃
  slug VARCHAR(255) NOT NULL,           -- chiang-mai-2024
  cover_image TEXT,                     -- 封面圖片 URL
  description TEXT,                     -- 描述
  
  status VARCHAR(50) DEFAULT 'draft',   -- draft / published / archived
  
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, slug)
);

-- 2. 紙娃娃內的景點
CREATE TABLE IF NOT EXISTS wishlist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES wishlist_templates(id) ON DELETE CASCADE,
  
  -- 景點資料（複製一份，避免景點庫刪除後影響）
  attraction_id UUID REFERENCES attractions(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  description TEXT,
  region VARCHAR(100),                  -- 地區分類
  category VARCHAR(100),                -- 類別（自然景觀、美食等）
  
  display_order INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 客人詢價單
CREATE TABLE IF NOT EXISTS customer_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id UUID REFERENCES wishlist_templates(id) ON DELETE SET NULL,
  
  -- 自動編號
  code VARCHAR(50),                     -- INQ-202603-001
  
  -- 客人資料
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  travel_date DATE,
  people_count INT DEFAULT 1,
  notes TEXT,                           -- 客人備註
  
  -- 選的景點
  selected_items JSONB DEFAULT '[]',    -- [{id, name, image_url, region}]
  
  -- 狀態管理
  status VARCHAR(50) DEFAULT 'pending', -- pending / contacted / quoted / converted / cancelled
  assigned_to UUID REFERENCES employees(id),
  internal_notes TEXT,                  -- 業務內部備註
  
  -- 轉換追蹤
  converted_to_quote_id UUID,           -- 轉成快速報價
  converted_to_tour_id UUID,            -- 轉成正式團
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_wishlist_templates_workspace ON wishlist_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_templates_status ON wishlist_templates(status);
CREATE INDEX IF NOT EXISTS idx_wishlist_templates_slug ON wishlist_templates(slug);

CREATE INDEX IF NOT EXISTS idx_wishlist_template_items_template ON wishlist_template_items(template_id);

CREATE INDEX IF NOT EXISTS idx_customer_inquiries_workspace ON customer_inquiries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customer_inquiries_template ON customer_inquiries(template_id);
CREATE INDEX IF NOT EXISTS idx_customer_inquiries_status ON customer_inquiries(status);

-- 自動編號函數
CREATE OR REPLACE FUNCTION generate_inquiry_code()
RETURNS TRIGGER AS $$
DECLARE
  year_month TEXT;
  seq_num INT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 'INQ-' || year_month || '-(\d+)') AS INT)
  ), 0) + 1
  INTO seq_num
  FROM customer_inquiries
  WHERE code LIKE 'INQ-' || year_month || '-%';
  
  NEW.code := 'INQ-' || year_month || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_customer_inquiry_code ON customer_inquiries;
CREATE TRIGGER tr_customer_inquiry_code
  BEFORE INSERT ON customer_inquiries
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_inquiry_code();

-- RLS
ALTER TABLE wishlist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_inquiries ENABLE ROW LEVEL SECURITY;

-- 公開讀取已發佈的紙娃娃（給 To C 用）
CREATE POLICY "Public can view published templates"
  ON wishlist_templates FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public can view template items"
  ON wishlist_template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wishlist_templates t 
      WHERE t.id = template_id AND t.status = 'published'
    )
  );

-- 公開可建立詢價單
CREATE POLICY "Public can create inquiries"
  ON customer_inquiries FOR INSERT
  WITH CHECK (true);

-- 內部管理（需要 service role）
CREATE POLICY "Service role full access templates"
  ON wishlist_templates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access items"
  ON wishlist_template_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access inquiries"
  ON customer_inquiries FOR ALL
  USING (true)
  WITH CHECK (true);
