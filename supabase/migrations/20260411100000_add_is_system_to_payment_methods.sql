-- ============================================
-- Migration: payment_methods 加 is_system 欄位
-- 系統預設的付款方式不可刪除，只能編輯/停用
-- 移除 LinkPay 預設，改為 4 種基本方式
-- Date: 2026-04-11
-- ============================================

BEGIN;

-- 1. 加 is_system 欄位
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN payment_methods.is_system IS '系統預設方式，不可刪除只能停用';

-- 2. 標記現有系統級付款方式
UPDATE payment_methods
SET is_system = TRUE
WHERE code IN ('CASH', 'TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH_PAYMENT', 'TRANSFER_PAYMENT', 'CARD_PAYMENT', 'CHECK_PAYMENT');

-- 3. LinkPay 標記為非系統級（租戶可自行決定要不要用）
UPDATE payment_methods
SET is_system = FALSE
WHERE code = 'LINKPAY';

-- 4. 更新新租戶 trigger：移除 LinkPay 預設，標記 is_system
CREATE OR REPLACE FUNCTION create_default_finance_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- =====================
  -- 1. 收款方式 (4 種，系統級)
  -- =====================
  INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order, is_system)
  VALUES
    (NEW.id, 'CASH', '現金', 'receipt', '現金收款', 1, TRUE),
    (NEW.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2, TRUE),
    (NEW.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3, TRUE),
    (NEW.id, 'CHECK', '支票', 'receipt', '支票收款', 4, TRUE);

  -- =====================
  -- 2. 付款方式 (4 種，系統級)
  -- =====================
  INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order, is_system)
  VALUES
    (NEW.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1, TRUE),
    (NEW.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2, TRUE),
    (NEW.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3, TRUE),
    (NEW.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4, TRUE);

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

COMMIT;
