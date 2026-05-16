-- 請款項目新增「員工代墊」欄位
ALTER TABLE payment_request_items
  ADD COLUMN IF NOT EXISTS advanced_by uuid REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS advanced_by_name text;

COMMENT ON COLUMN payment_request_items.advanced_by IS '代墊員工 ID';
COMMENT ON COLUMN payment_request_items.advanced_by_name IS '代墊員工姓名（冗餘，方便顯示）';
