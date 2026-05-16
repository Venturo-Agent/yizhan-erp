-- =====================================================
-- 收款單項目表 (receipt_items)
-- 讓一張收款單可以有多個項目，每個項目可以獨立移動到其他團
-- =====================================================

-- 1. 建立 receipt_items 表
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  
  -- 關聯（可獨立設定，允許項目移到其他團/訂單）
  tour_id TEXT REFERENCES tours(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  
  -- 金額
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(12,2) DEFAULT 0,
  
  -- 收款方式
  payment_method TEXT NOT NULL DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'cash', 'card', 'check', 'linkpay')),
  receipt_type INTEGER NOT NULL DEFAULT 0, -- 0:匯款 1:現金 2:刷卡 3:支票 4:LinkPay
  
  -- 收款方式相關欄位
  receipt_account TEXT, -- 付款人姓名/收款帳號
  handler_name TEXT, -- 經手人（現金用）
  account_info TEXT, -- 匯入帳戶（匯款用）
  fees NUMERIC(10,2), -- 手續費
  card_last_four TEXT, -- 卡號後四碼
  auth_code TEXT, -- 授權碼
  check_number TEXT, -- 支票號碼
  check_bank TEXT, -- 開票銀行
  check_date DATE, -- 支票兌現日期
  
  -- LinkPay 相關
  email TEXT,
  payment_name TEXT,
  pay_dateline TEXT,
  link TEXT,
  linkpay_order_number TEXT,
  
  -- 備註
  notes TEXT,
  
  -- 狀態（項目級別的狀態）
  status TEXT DEFAULT '0' CHECK (status IN ('0', '1', '2')), -- 0:待確認 1:已確認 2:異常
  
  -- 系統欄位
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  deleted_at TIMESTAMPTZ
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_tour_id ON receipt_items(tour_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_order_id ON receipt_items(order_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_workspace_id ON receipt_items(workspace_id);

-- 3. 遷移現有資料：把 receipts 的項目資料移到 receipt_items
INSERT INTO receipt_items (
  receipt_id,
  tour_id,
  order_id,
  customer_id,
  amount,
  actual_amount,
  payment_method,
  receipt_type,
  receipt_account,
  handler_name,
  account_info,
  fees,
  card_last_four,
  auth_code,
  check_number,
  check_bank,
  check_date,
  email,
  payment_name,
  pay_dateline,
  link,
  linkpay_order_number,
  notes,
  status,
  workspace_id,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  id as receipt_id,
  tour_id,
  order_id,
  customer_id,
  COALESCE(receipt_amount, amount, 0) as amount,
  COALESCE(actual_amount, 0) as actual_amount,
  COALESCE(payment_method, 'transfer') as payment_method,
  COALESCE(receipt_type, 0) as receipt_type,
  receipt_account,
  handler_name,
  account_info,
  fees,
  card_last_four,
  auth_code,
  check_number,
  check_bank,
  check_date,
  email,
  payment_name,
  pay_dateline,
  link,
  linkpay_order_number,
  notes,
  COALESCE(status, '0') as status,
  workspace_id,
  created_at,
  updated_at,
  created_by::uuid,
  updated_by::uuid
FROM receipts
WHERE deleted_at IS NULL;

-- 4. 更新 receipts 表：加入 total_amount 欄位（加總用）
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0;

-- 5. 計算並更新 total_amount
UPDATE receipts r
SET total_amount = (
  SELECT COALESCE(SUM(amount), 0)
  FROM receipt_items ri
  WHERE ri.receipt_id = r.id AND ri.deleted_at IS NULL
);

-- 6. 加入註解
COMMENT ON TABLE receipt_items IS '收款單項目表 - 一張收款單可有多個項目，每個項目可獨立移動到其他團';
COMMENT ON COLUMN receipt_items.receipt_id IS '關聯的收款單';
COMMENT ON COLUMN receipt_items.tour_id IS '關聯的團（可獨立設定，允許移動）';
COMMENT ON COLUMN receipt_items.order_id IS '關聯的訂單（可獨立設定，允許移動）';
COMMENT ON COLUMN receipts.total_amount IS '所有項目金額加總';

-- 7. 停用 RLS（開發階段）
ALTER TABLE receipt_items DISABLE ROW LEVEL SECURITY;
