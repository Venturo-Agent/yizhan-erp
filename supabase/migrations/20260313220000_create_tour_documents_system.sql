-- ================================================================
-- 旅遊團檔案管理系統（Linear 風格）
-- 日期: 2026-03-13
-- 功能: 需求單 + 文件版本管理 + 相關檔案
-- ================================================================

-- ============================================================
-- 1. tour_requests 表（需求單）
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  
  -- 來源追蹤（從哪裡產生的）
  source_type VARCHAR(50),  -- 'itinerary_item', 'quote', 'manual'
  source_id UUID,  -- itinerary_item_id 或 quote_id
  
  -- 需求基本資訊
  code VARCHAR(50),  -- 需求單編號（自動生成）
  request_type VARCHAR(50) NOT NULL,  -- '訂房', '訂車', '訂餐', '訂機票', '訂門票'
  
  -- 供應商資訊
  supplier_id UUID,
  supplier_name VARCHAR(255),
  supplier_contact TEXT,
  
  -- 需求項目（JSONB 陣列）
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{
  --   service_date: "2026-03-20",
  --   title: "豪華雙人房",
  --   quantity: 10,
  --   note: "需要雙床房型",
  --   unit_price: 3000,
  --   total_price: 30000
  -- }]
  
  -- 狀態追蹤
  status VARCHAR(50) NOT NULL DEFAULT '草稿',  -- '草稿', '已發送', '已回覆', '已確認', '結案', '取消'
  
  -- 發送記錄
  sent_at TIMESTAMPTZ,
  sent_via VARCHAR(50),  -- 'Line', 'Email', '傳真', 'WhatsApp'
  sent_to TEXT,  -- 收件人資訊
  
  -- 回覆記錄
  replied_at TIMESTAMPTZ,
  replied_by VARCHAR(255),  -- 供應商回覆人
  
  -- 確認記錄
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  
  -- 結案記錄
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  close_note TEXT,
  
  -- 備註
  note TEXT,
  
  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  
  CONSTRAINT tour_requests_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS tour_requests_workspace_id_idx ON tour_requests(workspace_id);
CREATE INDEX IF NOT EXISTS tour_requests_tour_id_idx ON tour_requests(tour_id);
CREATE INDEX IF NOT EXISTS tour_requests_status_idx ON tour_requests(status);
CREATE INDEX IF NOT EXISTS tour_requests_code_idx ON tour_requests(code);

-- ============================================================
-- 2. request_documents 表（需求單文件 - 支援多版本）
-- ============================================================
CREATE TABLE IF NOT EXISTS request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  request_id UUID NOT NULL REFERENCES tour_requests(id) ON DELETE CASCADE,
  
  -- 文件基本資訊
  document_type VARCHAR(50) NOT NULL,  -- '需求單', '供應商回覆', '修改單', '最終確認', '其他'
  version VARCHAR(20) NOT NULL,  -- 'v1.0', 'v2.0', 'v2.1'
  
  -- 檔案資訊
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,  -- bytes
  mime_type VARCHAR(100),
  
  -- 狀態追蹤
  status VARCHAR(50) NOT NULL DEFAULT '草稿',  -- '草稿', '已發送', '已收到', '已確認'
  
  -- 發送記錄
  sent_at TIMESTAMPTZ,
  sent_via VARCHAR(50),  -- 'Line', 'Email', '傳真'
  sent_to TEXT,
  
  -- 接收記錄
  received_at TIMESTAMPTZ,
  received_from VARCHAR(255),
  
  -- 描述與備註
  title VARCHAR(255),
  description TEXT,
  note TEXT,
  
  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT request_documents_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT request_documents_unique_version UNIQUE (request_id, version)
);

-- 索引
CREATE INDEX IF NOT EXISTS request_documents_workspace_id_idx ON request_documents(workspace_id);
CREATE INDEX IF NOT EXISTS request_documents_request_id_idx ON request_documents(request_id);
CREATE INDEX IF NOT EXISTS request_documents_document_type_idx ON request_documents(document_type);

-- ============================================================
-- 3. tour_files 表（其他檔案 - 護照/簽證/Logo等）
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  
  -- 分類
  category VARCHAR(50) NOT NULL,  -- 'passport', 'visa', 'contract', 'insurance', 'logo', 'bid_doc', 'photo', 'other'
  
  -- 可選關聯（彈性設計）
  related_request_id UUID REFERENCES tour_requests(id) ON DELETE SET NULL,
  related_item_id UUID,  -- 可以關聯核心表項目 (tour_itinerary_items)
  
  -- 檔案資訊
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,  -- bytes
  mime_type VARCHAR(100),
  
  -- 描述
  title VARCHAR(255),
  description TEXT,
  tags TEXT[],  -- 標籤陣列
  
  -- 備註
  note TEXT,
  
  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT tour_files_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS tour_files_workspace_id_idx ON tour_files(workspace_id);
CREATE INDEX IF NOT EXISTS tour_files_tour_id_idx ON tour_files(tour_id);
CREATE INDEX IF NOT EXISTS tour_files_category_idx ON tour_files(category);
CREATE INDEX IF NOT EXISTS tour_files_related_request_id_idx ON tour_files(related_request_id);

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- tour_requests policies
ALTER TABLE tour_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_requests_select_policy" ON tour_requests;
CREATE POLICY "tour_requests_select_policy" ON tour_requests
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "tour_requests_insert_policy" ON tour_requests;
CREATE POLICY "tour_requests_insert_policy" ON tour_requests
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "tour_requests_update_policy" ON tour_requests;
CREATE POLICY "tour_requests_update_policy" ON tour_requests
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "tour_requests_delete_policy" ON tour_requests;
CREATE POLICY "tour_requests_delete_policy" ON tour_requests
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- request_documents policies
ALTER TABLE request_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_documents_select_policy" ON request_documents;
CREATE POLICY "request_documents_select_policy" ON request_documents
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "request_documents_insert_policy" ON request_documents;
CREATE POLICY "request_documents_insert_policy" ON request_documents
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "request_documents_update_policy" ON request_documents;
CREATE POLICY "request_documents_update_policy" ON request_documents
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "request_documents_delete_policy" ON request_documents;
CREATE POLICY "request_documents_delete_policy" ON request_documents
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- tour_files policies
ALTER TABLE tour_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_files_select_policy" ON tour_files;
CREATE POLICY "tour_files_select_policy" ON tour_files
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "tour_files_insert_policy" ON tour_files;
CREATE POLICY "tour_files_insert_policy" ON tour_files
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "tour_files_update_policy" ON tour_files;
CREATE POLICY "tour_files_update_policy" ON tour_files
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

DROP POLICY IF EXISTS "tour_files_delete_policy" ON tour_files;
CREATE POLICY "tour_files_delete_policy" ON tour_files
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- ============================================================
-- 5. 自動更新 updated_at 的 trigger
-- ============================================================

-- tour_requests
DROP TRIGGER IF EXISTS tour_requests_updated_at_trigger ON tour_requests;
CREATE TRIGGER tour_requests_updated_at_trigger
  BEFORE UPDATE ON tour_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- request_documents
DROP TRIGGER IF EXISTS request_documents_updated_at_trigger ON request_documents;
CREATE TRIGGER request_documents_updated_at_trigger
  BEFORE UPDATE ON request_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- tour_files
DROP TRIGGER IF EXISTS tour_files_updated_at_trigger ON tour_files;
CREATE TRIGGER tour_files_updated_at_trigger
  BEFORE UPDATE ON tour_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. 註解
-- ============================================================

COMMENT ON TABLE tour_requests IS '旅遊團需求單表（訂房/訂車/訂餐等）';
COMMENT ON COLUMN tour_requests.source_type IS '來源類型：itinerary_item（行程表項目）, quote（報價單）, manual（手動建立）';
COMMENT ON COLUMN tour_requests.items IS '需求項目清單（JSONB 陣列）';
COMMENT ON COLUMN tour_requests.status IS '狀態：草稿, 已發送, 已回覆, 已確認, 結案, 取消';

COMMENT ON TABLE request_documents IS '需求單文件表（支援多版本）';
COMMENT ON COLUMN request_documents.document_type IS '文件類型：需求單, 供應商回覆, 修改單, 最終確認, 其他';
COMMENT ON COLUMN request_documents.version IS '版本號（v1.0, v2.0, v2.1）';

COMMENT ON TABLE tour_files IS '旅遊團其他檔案表（護照/簽證/Logo/標案文件等）';
COMMENT ON COLUMN tour_files.category IS '分類：passport, visa, contract, insurance, logo, bid_doc, photo, other';
COMMENT ON COLUMN tour_files.related_request_id IS '關聯的需求單（可選）';
COMMENT ON COLUMN tour_files.related_item_id IS '關聯的核心表項目（可選）';

-- ============================================================
-- 7. 初始化統計
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 檔案管理系統建立完成：';
  RAISE NOTICE '  - tour_requests 表（需求單）';
  RAISE NOTICE '  - request_documents 表（文件版本管理）';
  RAISE NOTICE '  - tour_files 表（其他檔案）';
  RAISE NOTICE '  - RLS policies 已啟用';
  RAISE NOTICE '  - Triggers 已建立';
END $$;
