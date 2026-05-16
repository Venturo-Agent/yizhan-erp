-- ============================================
-- Migration: 新租戶自動建立預設財務設定
-- Date: 2026-03-28
-- Author: Matthew (AI Agent)
-- ============================================

-- 建立函數：為新 workspace 建立完整預設財務設定
CREATE OR REPLACE FUNCTION create_default_finance_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- =====================
  -- 1. 收款方式 (5 種)
  -- =====================
  INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
  VALUES 
    (NEW.id, 'CASH', '現金', 'receipt', '現金收款', 1),
    (NEW.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2),
    (NEW.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3),
    (NEW.id, 'CHECK', '支票', 'receipt', '支票收款', 4),
    (NEW.id, 'LINKPAY', 'LinkPay', 'receipt', 'LinkPay 線上收款', 5);
  
  -- 標記 LinkPay 為需要串接
  UPDATE payment_methods 
  SET requires_integration = TRUE,
      integration_type = 'linkpay',
      integration_status = 'pending'
  WHERE code = 'LINKPAY' AND workspace_id = NEW.id;
  
  -- =====================
  -- 2. 付款方式 (4 種)
  -- =====================
  INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
  VALUES 
    (NEW.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1),
    (NEW.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2),
    (NEW.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3),
    (NEW.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4);
  
  -- =====================
  -- 3. 銀行帳戶 (3 個基本帳戶)
  -- =====================
  INSERT INTO bank_accounts (workspace_id, code, name, bank_name, is_default, is_active)
  VALUES 
    (NEW.id, 'CASH', '現金', NULL, TRUE, TRUE),
    (NEW.id, 'BANK1', '主要銀行帳戶', '請設定銀行名稱', FALSE, TRUE),
    (NEW.id, 'BANK2', '備用銀行帳戶', '請設定銀行名稱', FALSE, TRUE);
  
  -- =====================
  -- 4. 會計科目 - 收入類 (revenue)
  -- =====================
  INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
  VALUES 
    (NEW.id, '4111', '銷貨收入', 'revenue', 1, TRUE, TRUE, '旅遊銷售收入'),
    (NEW.id, '4112', '服務收入', 'revenue', 1, TRUE, TRUE, '服務費收入'),
    (NEW.id, '4113', '代收款', 'revenue', 1, TRUE, TRUE, '代收代付款項'),
    (NEW.id, '4199', '其他收入', 'revenue', 1, TRUE, TRUE, '其他營業收入');
  
  -- =====================
  -- 5. 會計科目 - 支出類 (expense)
  -- =====================
  INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
  VALUES 
    (NEW.id, '5111', '銷貨成本', 'expense', 1, TRUE, TRUE, '旅遊成本'),
    (NEW.id, '5112', '住宿成本', 'expense', 1, TRUE, TRUE, '飯店/住宿費用'),
    (NEW.id, '5113', '交通成本', 'expense', 1, TRUE, TRUE, '遊覽車/機票等'),
    (NEW.id, '5114', '餐飲成本', 'expense', 1, TRUE, TRUE, '餐廳費用'),
    (NEW.id, '5115', '導遊成本', 'expense', 1, TRUE, TRUE, '導遊/領隊費用'),
    (NEW.id, '5116', '門票成本', 'expense', 1, TRUE, TRUE, '景點門票'),
    (NEW.id, '5117', '保險成本', 'expense', 1, TRUE, TRUE, '旅遊平安險'),
    (NEW.id, '5199', '其他成本', 'expense', 1, TRUE, TRUE, '其他旅遊相關成本'),
    (NEW.id, '6111', '薪資費用', 'expense', 1, TRUE, TRUE, '員工薪資'),
    (NEW.id, '6112', '租金費用', 'expense', 1, TRUE, TRUE, '辦公室租金'),
    (NEW.id, '6113', '水電費', 'expense', 1, TRUE, TRUE, '水電瓦斯'),
    (NEW.id, '6199', '其他費用', 'expense', 1, TRUE, TRUE, '其他營業費用');
  
  -- =====================
  -- 6. 會計科目 - 資產類 (asset)
  -- =====================
  INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
  VALUES 
    (NEW.id, '1111', '現金', 'asset', 1, TRUE, TRUE, '庫存現金'),
    (NEW.id, '1121', '銀行存款', 'asset', 1, TRUE, TRUE, '銀行帳戶餘額'),
    (NEW.id, '1131', '應收帳款', 'asset', 1, TRUE, TRUE, '應收客戶款項'),
    (NEW.id, '1141', '預付款項', 'asset', 1, TRUE, TRUE, '預付供應商款項');
  
  -- =====================
  -- 7. 會計科目 - 負債類 (liability)
  -- =====================
  INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
  VALUES 
    (NEW.id, '2111', '應付帳款', 'liability', 1, TRUE, TRUE, '應付供應商款項'),
    (NEW.id, '2121', '預收款項', 'liability', 1, TRUE, TRUE, '預收客戶款項'),
    (NEW.id, '2131', '代收款', 'liability', 1, TRUE, TRUE, '代收代付款項');
  
  -- =====================
  -- 8. 會計科目 - 權益類 (equity)
  -- =====================
  INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
  VALUES 
    (NEW.id, '3111', '股本', 'equity', 1, TRUE, TRUE, '資本額'),
    (NEW.id, '3211', '保留盈餘', 'equity', 1, TRUE, TRUE, '累積盈餘');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立 trigger：當 workspace 建立時自動執行
-- 刪除舊 trigger 並建立新的
DROP TRIGGER IF EXISTS trg_create_default_payment_methods ON workspaces;
DROP TRIGGER IF EXISTS trg_create_default_finance_settings ON workspaces;
CREATE TRIGGER trg_create_default_finance_settings
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_finance_settings();

-- 補齊既有 workspace 的預設設定（如果沒有的話）
DO $$
DECLARE
  ws RECORD;
  cnt INT;
BEGIN
  FOR ws IN SELECT id FROM workspaces LOOP
    -- =====================
    -- 1. 收款方式
    -- =====================
    SELECT COUNT(*) INTO cnt FROM payment_methods WHERE workspace_id = ws.id AND type = 'receipt';
    IF cnt = 0 THEN
      INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
      VALUES 
        (ws.id, 'CASH', '現金', 'receipt', '現金收款', 1),
        (ws.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2),
        (ws.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3),
        (ws.id, 'CHECK', '支票', 'receipt', '支票收款', 4),
        (ws.id, 'LINKPAY', 'LinkPay', 'receipt', 'LinkPay 線上收款', 5);
      UPDATE payment_methods 
      SET requires_integration = TRUE, integration_type = 'linkpay', integration_status = 'pending'
      WHERE code = 'LINKPAY' AND workspace_id = ws.id;
    END IF;
    
    -- =====================
    -- 2. 付款方式
    -- =====================
    SELECT COUNT(*) INTO cnt FROM payment_methods WHERE workspace_id = ws.id AND type = 'payment';
    IF cnt = 0 THEN
      INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
      VALUES 
        (ws.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1),
        (ws.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2),
        (ws.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3),
        (ws.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4);
    END IF;
    
    -- =====================
    -- 3. 銀行帳戶
    -- =====================
    SELECT COUNT(*) INTO cnt FROM bank_accounts WHERE workspace_id = ws.id;
    IF cnt = 0 THEN
      INSERT INTO bank_accounts (workspace_id, code, name, bank_name, is_default, is_active)
      VALUES 
        (ws.id, 'CASH', '現金', NULL, TRUE, TRUE),
        (ws.id, 'BANK1', '主要銀行帳戶', '請設定銀行名稱', FALSE, TRUE),
        (ws.id, 'BANK2', '備用銀行帳戶', '請設定銀行名稱', FALSE, TRUE);
    END IF;
    
    -- =====================
    -- 4. 會計科目（只補齊沒有的 workspace）
    -- =====================
    SELECT COUNT(*) INTO cnt FROM accounting_subjects WHERE workspace_id = ws.id;
    IF cnt = 0 THEN
      -- 收入類
      INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
      VALUES 
        (ws.id, '4111', '銷貨收入', 'revenue', 1, TRUE, TRUE, '旅遊銷售收入'),
        (ws.id, '4112', '服務收入', 'revenue', 1, TRUE, TRUE, '服務費收入'),
        (ws.id, '4113', '代收款', 'revenue', 1, TRUE, TRUE, '代收代付款項'),
        (ws.id, '4199', '其他收入', 'revenue', 1, TRUE, TRUE, '其他營業收入');
      -- 支出類
      INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
      VALUES 
        (ws.id, '5111', '銷貨成本', 'expense', 1, TRUE, TRUE, '旅遊成本'),
        (ws.id, '5112', '住宿成本', 'expense', 1, TRUE, TRUE, '飯店/住宿費用'),
        (ws.id, '5113', '交通成本', 'expense', 1, TRUE, TRUE, '遊覽車/機票等'),
        (ws.id, '5114', '餐飲成本', 'expense', 1, TRUE, TRUE, '餐廳費用'),
        (ws.id, '5115', '導遊成本', 'expense', 1, TRUE, TRUE, '導遊/領隊費用'),
        (ws.id, '5116', '門票成本', 'expense', 1, TRUE, TRUE, '景點門票'),
        (ws.id, '5117', '保險成本', 'expense', 1, TRUE, TRUE, '旅遊平安險'),
        (ws.id, '5199', '其他成本', 'expense', 1, TRUE, TRUE, '其他旅遊相關成本'),
        (ws.id, '6111', '薪資費用', 'expense', 1, TRUE, TRUE, '員工薪資'),
        (ws.id, '6112', '租金費用', 'expense', 1, TRUE, TRUE, '辦公室租金'),
        (ws.id, '6113', '水電費', 'expense', 1, TRUE, TRUE, '水電瓦斯'),
        (ws.id, '6199', '其他費用', 'expense', 1, TRUE, TRUE, '其他營業費用');
      -- 資產類
      INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
      VALUES 
        (ws.id, '1111', '現金', 'asset', 1, TRUE, TRUE, '庫存現金'),
        (ws.id, '1121', '銀行存款', 'asset', 1, TRUE, TRUE, '銀行帳戶餘額'),
        (ws.id, '1131', '應收帳款', 'asset', 1, TRUE, TRUE, '應收客戶款項'),
        (ws.id, '1141', '預付款項', 'asset', 1, TRUE, TRUE, '預付供應商款項');
      -- 負債類
      INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
      VALUES 
        (ws.id, '2111', '應付帳款', 'liability', 1, TRUE, TRUE, '應付供應商款項'),
        (ws.id, '2121', '預收款項', 'liability', 1, TRUE, TRUE, '預收客戶款項'),
        (ws.id, '2131', '代收款', 'liability', 1, TRUE, TRUE, '代收代付款項');
      -- 權益類
      INSERT INTO accounting_subjects (workspace_id, code, name, type, level, is_system, is_active, description)
      VALUES 
        (ws.id, '3111', '股本', 'equity', 1, TRUE, TRUE, '資本額'),
        (ws.id, '3211', '保留盈餘', 'equity', 1, TRUE, TRUE, '累積盈餘');
    END IF;
  END LOOP;
END $$;

-- 驗證結果
SELECT 'payment_methods' as table_name, workspace_id, type, COUNT(*) as count
FROM payment_methods GROUP BY workspace_id, type
UNION ALL
SELECT 'bank_accounts', workspace_id, 'account', COUNT(*)
FROM bank_accounts GROUP BY workspace_id
UNION ALL
SELECT 'accounting_subjects', workspace_id, type, COUNT(*)
FROM accounting_subjects GROUP BY workspace_id, type
ORDER BY table_name, workspace_id;
