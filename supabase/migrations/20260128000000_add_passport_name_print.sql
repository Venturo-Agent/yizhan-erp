-- 新增 passport_name_print 欄位（行李吊牌用）
-- 格式：CHEN, YI-HSUAN（逗號 + 保留 hyphen）

-- 1. customers 表
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS passport_name_print TEXT;

COMMENT ON COLUMN customers.passport_name_print IS '護照姓名列印格式（行李吊牌用），格式：姓, 名-名';

-- 2. order_members 表
ALTER TABLE order_members
ADD COLUMN IF NOT EXISTS passport_name_print TEXT;

COMMENT ON COLUMN order_members.passport_name_print IS '護照姓名列印格式（行李吊牌用），格式：姓, 名-名';

-- 3. 為舊資料產生 passport_name_print（把 / 換成 , ）
-- 注意：如果原本 hyphen 已丟失，這裡無法還原

UPDATE customers
SET passport_name_print = REPLACE(passport_name, '/', ', ')
WHERE passport_name IS NOT NULL
  AND passport_name_print IS NULL;

UPDATE order_members
SET passport_name_print = REPLACE(passport_name, '/', ', ')
WHERE passport_name IS NOT NULL
  AND passport_name_print IS NULL;

-- 4. 建立索引（可選，如果需要搜尋）
-- CREATE INDEX IF NOT EXISTS idx_customers_passport_name_print ON customers(passport_name_print);
-- CREATE INDEX IF NOT EXISTS idx_order_members_passport_name_print ON order_members(passport_name_print);
