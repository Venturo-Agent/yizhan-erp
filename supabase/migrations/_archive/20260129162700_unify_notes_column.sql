-- 統一備註欄位名稱為 notes

-- customer_groups: note → notes
ALTER TABLE customer_groups RENAME COLUMN note TO notes;
COMMENT ON COLUMN customer_groups.notes IS '備註（統一命名）';

-- payment_request_items: note → notes  
ALTER TABLE payment_request_items RENAME COLUMN note TO notes;
COMMENT ON COLUMN payment_request_items.notes IS '備註（統一命名）';
