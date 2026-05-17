-- 修 tenant create trigger：補 payment_methods 欄位 + 改 trigger 用 chart_of_accounts
-- 原 trigger insert accounting_subjects（不存在）+ payment_methods 用 requires_integration 等不存在欄位

BEGIN;

-- 1. payment_methods 補 integration 相關欄位
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS requires_integration boolean DEFAULT false;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS integration_type varchar(50);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS integration_config jsonb;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS integration_status varchar(50) DEFAULT 'pending';

-- 2. 改 trigger function：accounting_subjects → chart_of_accounts、column name 對齊
CREATE OR REPLACE FUNCTION public.create_default_finance_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. 收款方式 (4 種)
  INSERT INTO public.payment_methods (workspace_id, code, name, type, description, sort_order)
  VALUES
    (NEW.id, 'CASH', '現金', 'receipt', '現金收款', 1),
    (NEW.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2),
    (NEW.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3),
    (NEW.id, 'CHECK', '支票', 'receipt', '支票收款', 4)
  ON CONFLICT DO NOTHING;

  -- 2. 付款方式 (4 種)
  INSERT INTO public.payment_methods (workspace_id, code, name, type, description, sort_order)
  VALUES
    (NEW.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1),
    (NEW.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2),
    (NEW.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3),
    (NEW.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4)
  ON CONFLICT DO NOTHING;

  -- 3. 銀行帳戶 (3 個)
  INSERT INTO public.bank_accounts (workspace_id, code, name, bank_name, is_default, is_active)
  VALUES
    (NEW.id, 'CASH', '現金', NULL, TRUE, TRUE),
    (NEW.id, 'BANK1', '主要銀行帳戶', '請設定銀行名稱', FALSE, TRUE),
    (NEW.id, 'BANK2', '備用銀行帳戶', '請設定銀行名稱', FALSE, TRUE)
  ON CONFLICT DO NOTHING;

  -- 4. 會計科目 - 完整 27 條（chart_of_accounts、column = account_type / is_system_locked）
  INSERT INTO public.chart_of_accounts (workspace_id, code, name, account_type, is_system_locked, is_active, description)
  VALUES
    -- 收入類
    (NEW.id, '4111', '銷貨收入', 'revenue', TRUE, TRUE, '旅遊銷售收入'),
    (NEW.id, '4112', '服務收入', 'revenue', TRUE, TRUE, '服務費收入'),
    (NEW.id, '4113', '代收款', 'revenue', TRUE, TRUE, '代收代付款項'),
    (NEW.id, '4199', '其他收入', 'revenue', TRUE, TRUE, '其他營業收入'),
    -- 支出類（成本 + 費用）
    (NEW.id, '5111', '銷貨成本', 'cost', TRUE, TRUE, '旅遊成本'),
    (NEW.id, '5112', '住宿成本', 'cost', TRUE, TRUE, '飯店/住宿費用'),
    (NEW.id, '5113', '交通成本', 'cost', TRUE, TRUE, '遊覽車/機票等'),
    (NEW.id, '5114', '餐飲成本', 'cost', TRUE, TRUE, '餐廳費用'),
    (NEW.id, '5115', '導遊成本', 'cost', TRUE, TRUE, '導遊/領隊費用'),
    (NEW.id, '5116', '門票成本', 'cost', TRUE, TRUE, '景點門票'),
    (NEW.id, '5117', '保險成本', 'cost', TRUE, TRUE, '旅遊平安險'),
    (NEW.id, '5199', '其他成本', 'cost', TRUE, TRUE, '其他旅遊相關成本'),
    (NEW.id, '6111', '薪資費用', 'expense', TRUE, TRUE, '員工薪資'),
    (NEW.id, '6112', '租金費用', 'expense', TRUE, TRUE, '辦公室租金'),
    (NEW.id, '6113', '水電費', 'expense', TRUE, TRUE, '水電瓦斯'),
    (NEW.id, '6199', '其他費用', 'expense', TRUE, TRUE, '其他營業費用'),
    -- 資產類
    (NEW.id, '1111', '現金', 'asset', TRUE, TRUE, '庫存現金'),
    (NEW.id, '1121', '銀行存款', 'asset', TRUE, TRUE, '銀行帳戶餘額'),
    (NEW.id, '1131', '應收帳款', 'asset', TRUE, TRUE, '應收客戶款項'),
    (NEW.id, '1141', '預付款項', 'asset', TRUE, TRUE, '預付供應商款項'),
    -- 負債類
    (NEW.id, '2111', '應付帳款', 'liability', TRUE, TRUE, '應付供應商款項'),
    (NEW.id, '2121', '預收款項', 'liability', TRUE, TRUE, '預收客戶款項'),
    (NEW.id, '2131', '代收款', 'liability', TRUE, TRUE, '代收代付款項'),
    -- 權益類
    (NEW.id, '3111', '股本', 'equity', TRUE, TRUE, '資本額'),
    (NEW.id, '3211', '保留盈餘', 'equity', TRUE, TRUE, '累積盈餘')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- account_type CHECK constraint：確認允許 'cost'（如有 constraint）
DO $$
DECLARE
  cdef text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO cdef
  FROM pg_constraint
  WHERE conrelid = 'public.chart_of_accounts'::regclass
    AND contype = 'c'
    AND conname LIKE '%account_type%';
  IF cdef IS NOT NULL AND cdef NOT LIKE '%cost%' THEN
    -- 找到了不含 cost 的 check、drop 重建
    EXECUTE 'ALTER TABLE public.chart_of_accounts DROP CONSTRAINT ' ||
      (SELECT conname FROM pg_constraint WHERE conrelid = 'public.chart_of_accounts'::regclass AND contype='c' AND conname LIKE '%account_type%' LIMIT 1);
  END IF;
END $$;

-- 補一個寬鬆 check（asset/liability/equity/revenue/cost/expense）
DO $$ BEGIN
  ALTER TABLE public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_account_type_check
    CHECK (account_type IN ('asset','liability','equity','revenue','cost','expense'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
