-- ================================================================
-- 需求單文件表 - 新增供應商回覆欄位
-- 日期: 2026-03-13
-- 功能: 區分「我方發送」和「供應商回覆」
-- ================================================================

-- 新增欄位
ALTER TABLE request_documents
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES request_documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_type VARCHAR(20) DEFAULT 'sent';

-- 建立索引
CREATE INDEX IF NOT EXISTS request_documents_parent_document_id_idx 
  ON request_documents(parent_document_id);

CREATE INDEX IF NOT EXISTS request_documents_reply_type_idx 
  ON request_documents(reply_type);

-- 註解
COMMENT ON COLUMN request_documents.parent_document_id IS '關聯到哪個需求單版本（供應商回覆時使用）';
COMMENT ON COLUMN request_documents.reply_type IS '類型：sent（我方發送）, received（供應商回覆）';

-- 更新現有資料（預設都是我方發送）
UPDATE request_documents 
SET reply_type = 'sent' 
WHERE reply_type IS NULL;

-- 統計
DO $$
BEGIN
  RAISE NOTICE '✅ 欄位新增完成：';
  RAISE NOTICE '  - parent_document_id（關聯父文件）';
  RAISE NOTICE '  - reply_type（sent/received）';
  RAISE NOTICE '  - 索引已建立';
END $$;
