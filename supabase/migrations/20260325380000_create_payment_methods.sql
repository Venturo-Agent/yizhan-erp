-- ============================================
-- Migration: 建立 payment_methods 表
-- Date: 2026-03-25
-- Author: Matthew (AI Agent)
-- ============================================

-- 建立 payment_methods 表
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('receipt', 'payment')),
  description TEXT,
  
  -- 是否需要工程师串接
  requires_integration BOOLEAN DEFAULT FALSE,
  
  -- 串接类型（如果需要）
  integration_type VARCHAR(50), -- 'linkpay' | 'bank_virtual' | 'ecpay' | 'newebpay'
  
  -- 串接设定（JSON）
  integration_config JSONB,
  
  -- 串接状态
  integration_status VARCHAR(50) DEFAULT 'pending' CHECK (integration_status IN ('pending', 'active', 'inactive')),
  
  -- 借方/贷方会计科目（可选）
  debit_account_id UUID REFERENCES accounting_subjects(id),
  credit_account_id UUID REFERENCES accounting_subjects(id),
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  
  UNIQUE(workspace_id, code)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payment_methods_workspace ON payment_methods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);

-- 插入 Corner 的預設收款方式
DO $$
DECLARE
  corner_workspace_id UUID;
  record_exists INT;
BEGIN
  -- 取得 Corner 的 workspace_id
  SELECT id INTO corner_workspace_id FROM workspaces WHERE code = 'CORNER';
  
  IF corner_workspace_id IS NOT NULL THEN
    -- 檢查是否已有資料（避免重複插入）
    SELECT COUNT(*) INTO record_exists FROM payment_methods WHERE workspace_id = corner_workspace_id;
    
    IF record_exists = 0 THEN
      -- 插入 5 種收款方式
      INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
      VALUES 
        (corner_workspace_id, 'CASH', '現金', 'receipt', '現金收款', 1),
        (corner_workspace_id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2),
        (corner_workspace_id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3),
        (corner_workspace_id, 'CHECK', '支票', 'receipt', '支票收款', 4),
        (corner_workspace_id, 'LINKPAY', 'LinkPay', 'receipt', 'LinkPay 線上收款', 5);
      
      -- 標記 LinkPay 為需要串接
      UPDATE payment_methods 
      SET requires_integration = TRUE,
          integration_type = 'linkpay',
          integration_status = 'active'
      WHERE code = 'LINKPAY' AND workspace_id = corner_workspace_id;
      
      -- 插入 4 種付款方式（請款用）
      INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
      VALUES 
        (corner_workspace_id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1),
        (corner_workspace_id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2),
        (corner_workspace_id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3),
        (corner_workspace_id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4);
    END IF;
  END IF;
END $$;

-- 如果 receipts 表還沒有 payment_method_id FK，加上它
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_receipts_payment_method'
    AND table_name = 'receipts'
  ) THEN
    ALTER TABLE receipts 
    ADD CONSTRAINT fk_receipts_payment_method 
    FOREIGN KEY (payment_method_id) 
    REFERENCES payment_methods(id) 
    ON DELETE RESTRICT;
  END IF;
END $$;

-- 驗證
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'payment_methods';
