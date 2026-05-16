-- 加入 LINE user ID 欄位到詢價單
ALTER TABLE customer_inquiries 
ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- 建立索引方便查詢
CREATE INDEX IF NOT EXISTS idx_customer_inquiries_line_user_id 
ON customer_inquiries(line_user_id) WHERE line_user_id IS NOT NULL;

COMMENT ON COLUMN customer_inquiries.line_user_id IS 'LINE 用戶 ID，用於推播通知';
