-- ============================================
-- 自動過帳 Trigger
-- 當收款單/請款單確認時，自動產生會計傳票
-- ============================================

BEGIN;

-- ============================================
-- 1. 傳票編號生成函數
-- ============================================

CREATE OR REPLACE FUNCTION generate_voucher_no(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_last_no text;
  v_next_num int;
BEGIN
  -- 格式：JV{YYYYMM}{0001-9999}
  v_prefix := 'JV' || to_char(CURRENT_DATE, 'YYYYMM');

  -- 查詢當月最大編號
  SELECT voucher_no INTO v_last_no
  FROM journal_vouchers
  WHERE workspace_id = p_workspace_id
    AND voucher_no LIKE v_prefix || '%'
  ORDER BY voucher_no DESC
  LIMIT 1;

  IF v_last_no IS NULL THEN
    v_next_num := 1;
  ELSE
    v_next_num := COALESCE(
      NULLIF(regexp_replace(v_last_no, '^' || v_prefix, ''), '')::int + 1,
      1
    );
  END IF;

  RETURN v_prefix || lpad(v_next_num::text, 4, '0');
END;
$$;

-- ============================================
-- 2. 取得科目 ID 函數
-- ============================================

CREATE OR REPLACE FUNCTION get_account_id_by_code(p_workspace_id uuid, p_code text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT id INTO v_account_id
  FROM chart_of_accounts
  WHERE workspace_id = p_workspace_id
    AND code = p_code
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

-- ============================================
-- 3. 收款單自動過帳函數
-- ============================================

CREATE OR REPLACE FUNCTION auto_post_customer_receipt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id uuid;
  v_voucher_id uuid;
  v_voucher_no text;
  v_bank_acct_id uuid;
  v_prepaid_acct_id uuid;
  v_fee_acct_id uuid;
  v_gross_amount numeric;
  v_fee_amount numeric;
  v_net_amount numeric;
  v_fee_rate numeric;
  v_payment_method text;
  v_memo text;
  v_line_no int;
BEGIN
  -- 只在狀態變更為 '1' (已確認) 時觸發
  IF NEW.status = '1' AND (OLD.status IS NULL OR OLD.status <> '1') THEN

    -- 檢查是否已經過帳過
    IF EXISTS (
      SELECT 1 FROM accounting_events
      WHERE source_type = 'payment_receipt'
        AND source_id = NEW.id::text
        AND status = 'posted'
    ) THEN
      RETURN NEW; -- 已過帳，跳過
    END IF;

    -- 準備金額
    v_gross_amount := COALESCE(NEW.actual_amount, NEW.receipt_amount, NEW.amount);

    -- 根據收款方式設定
    -- receipt_type: 0=匯款, 1=現金, 2=刷卡, 3=支票, 4=LinkPay
    CASE NEW.receipt_type
      WHEN 0 THEN
        v_payment_method := 'transfer';
        v_fee_rate := 0;
      WHEN 1 THEN
        v_payment_method := 'cash';
        v_fee_rate := 0;
      WHEN 2 THEN
        v_payment_method := 'credit_card';
        v_fee_rate := 0.0168; -- 刷卡手續費 1.68%
      WHEN 3 THEN
        v_payment_method := 'check';
        v_fee_rate := 0;
      WHEN 4 THEN
        v_payment_method := 'linkpay';
        v_fee_rate := 0.02; -- LinkPay 手續費 2%
      ELSE
        v_payment_method := 'other';
        v_fee_rate := 0;
    END CASE;

    -- 計算手續費
    IF NEW.receipt_type IN (2, 4) THEN -- 刷卡或 LinkPay
      v_fee_amount := ROUND(v_gross_amount * v_fee_rate);
    ELSE
      v_fee_amount := COALESCE(NEW.fees, 0);
    END IF;
    v_net_amount := v_gross_amount - v_fee_amount;

    -- 取得科目 ID
    IF NEW.receipt_type = 1 THEN -- 現金
      v_bank_acct_id := get_account_id_by_code(NEW.workspace_id, '1110');
    ELSE
      v_bank_acct_id := get_account_id_by_code(NEW.workspace_id, '1100');
    END IF;
    v_prepaid_acct_id := get_account_id_by_code(NEW.workspace_id, '2100'); -- 預收團款
    v_fee_acct_id := get_account_id_by_code(NEW.workspace_id, '6100'); -- 刷卡手續費

    -- 檢查必要科目是否存在
    IF v_bank_acct_id IS NULL OR v_prepaid_acct_id IS NULL THEN
      RAISE WARNING 'Missing chart of accounts for workspace %, skipping auto-posting', NEW.workspace_id;
      RETURN NEW;
    END IF;

    -- 生成 ID
    v_event_id := gen_random_uuid();
    v_voucher_id := gen_random_uuid();
    v_voucher_no := generate_voucher_no(NEW.workspace_id);

    -- 設定摘要
    v_memo := '客戶收款 - ' ||
      CASE v_payment_method
        WHEN 'cash' THEN '現金'
        WHEN 'credit_card' THEN '刷卡'
        WHEN 'transfer' THEN '匯款'
        WHEN 'check' THEN '支票'
        WHEN 'linkpay' THEN 'LinkPay'
        ELSE '其他'
      END ||
      COALESCE(' (' || NEW.receipt_number || ')', '');

    -- 建立會計事件
    INSERT INTO accounting_events (
      id, workspace_id, event_type, source_type, source_id,
      tour_id, event_date, meta, status, created_by, created_at, updated_at
    ) VALUES (
      v_event_id,
      NEW.workspace_id,
      'customer_receipt_posted',
      'payment_receipt',
      NEW.id::text,
      NEW.tour_id,
      CURRENT_DATE,
      jsonb_build_object(
        'payment_method', v_payment_method,
        'gross_amount', v_gross_amount,
        'fee_rate', v_fee_rate,
        'fee_amount', v_fee_amount,
        'net_amount', v_net_amount,
        'receipt_number', NEW.receipt_number
      ),
      'posted',
      NEW.confirmed_by,
      NOW(),
      NOW()
    );

    -- 建立傳票
    INSERT INTO journal_vouchers (
      id, workspace_id, voucher_no, voucher_date, memo,
      event_id, status, total_debit, total_credit,
      created_by, created_at, updated_at
    ) VALUES (
      v_voucher_id,
      NEW.workspace_id,
      v_voucher_no,
      CURRENT_DATE,
      v_memo,
      v_event_id,
      'posted',
      v_gross_amount,
      v_gross_amount,
      NEW.confirmed_by,
      NOW(),
      NOW()
    );

    -- 建立分錄
    v_line_no := 1;

    -- Dr 銀行存款/現金（實收金額）
    INSERT INTO journal_lines (
      id, voucher_id, line_no, account_id, description,
      debit_amount, credit_amount
    ) VALUES (
      gen_random_uuid(),
      v_voucher_id,
      v_line_no,
      v_bank_acct_id,
      CASE WHEN NEW.receipt_type = 2 THEN '刷卡收款（實收）'
           WHEN NEW.receipt_type = 4 THEN 'LinkPay收款（實收）'
           ELSE '收款'
      END,
      v_net_amount,
      0
    );
    v_line_no := v_line_no + 1;

    -- Dr 手續費（如果有）
    IF v_fee_amount > 0 AND v_fee_acct_id IS NOT NULL THEN
      INSERT INTO journal_lines (
        id, voucher_id, line_no, account_id, description,
        debit_amount, credit_amount
      ) VALUES (
        gen_random_uuid(),
        v_voucher_id,
        v_line_no,
        v_fee_acct_id,
        CASE WHEN NEW.receipt_type = 2 THEN '刷卡手續費 ' || (v_fee_rate * 100)::text || '%'
             WHEN NEW.receipt_type = 4 THEN 'LinkPay手續費 ' || (v_fee_rate * 100)::text || '%'
             ELSE '手續費'
        END,
        v_fee_amount,
        0
      );
      v_line_no := v_line_no + 1;
    END IF;

    -- Cr 預收團款
    INSERT INTO journal_lines (
      id, voucher_id, line_no, account_id, description,
      debit_amount, credit_amount
    ) VALUES (
      gen_random_uuid(),
      v_voucher_id,
      v_line_no,
      v_prepaid_acct_id,
      '預收團款',
      0,
      v_gross_amount
    );

    RAISE NOTICE 'Auto-posted receipt % as voucher %', NEW.receipt_number, v_voucher_no;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 4. 請款單自動過帳函數
-- ============================================

CREATE OR REPLACE FUNCTION auto_post_supplier_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id uuid;
  v_voucher_id uuid;
  v_voucher_no text;
  v_prepaid_cost_acct_id uuid;
  v_bank_acct_id uuid;
  v_amount numeric;
  v_memo text;
BEGIN
  -- 只在狀態變更為 'confirmed' 或 'paid' 時觸發
  IF NEW.status IN ('confirmed', 'paid') AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'paid')) THEN

    -- 檢查是否已經過帳過
    IF EXISTS (
      SELECT 1 FROM accounting_events
      WHERE source_type = 'payout'
        AND source_id = NEW.id::text
        AND status = 'posted'
    ) THEN
      RETURN NEW; -- 已過帳，跳過
    END IF;

    -- 準備金額
    v_amount := COALESCE(NEW.total_amount, NEW.amount);

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RETURN NEW; -- 無金額，跳過
    END IF;

    -- 取得科目 ID
    v_prepaid_cost_acct_id := get_account_id_by_code(NEW.workspace_id, '1200'); -- 預付團務成本
    v_bank_acct_id := get_account_id_by_code(NEW.workspace_id, '1100'); -- 銀行存款

    -- 檢查必要科目是否存在
    IF v_prepaid_cost_acct_id IS NULL OR v_bank_acct_id IS NULL THEN
      RAISE WARNING 'Missing chart of accounts for workspace %, skipping auto-posting', NEW.workspace_id;
      RETURN NEW;
    END IF;

    -- 生成 ID
    v_event_id := gen_random_uuid();
    v_voucher_id := gen_random_uuid();
    v_voucher_no := generate_voucher_no(NEW.workspace_id);

    -- 設定摘要
    v_memo := '供應商付款' || COALESCE(' (' || NEW.code || ')', '') ||
              COALESCE(' - ' || NEW.supplier_name, '');

    -- 建立會計事件
    INSERT INTO accounting_events (
      id, workspace_id, event_type, source_type, source_id,
      tour_id, event_date, meta, status, created_by, created_at, updated_at
    ) VALUES (
      v_event_id,
      NEW.workspace_id,
      'supplier_payment_posted',
      'payout',
      NEW.id::text,
      NEW.tour_id,
      CURRENT_DATE,
      jsonb_build_object(
        'amount', v_amount,
        'supplier_name', NEW.supplier_name,
        'payment_request_code', NEW.code
      ),
      'posted',
      COALESCE(NEW.paid_by, NEW.approved_by),
      NOW(),
      NOW()
    );

    -- 建立傳票
    INSERT INTO journal_vouchers (
      id, workspace_id, voucher_no, voucher_date, memo,
      event_id, status, total_debit, total_credit,
      created_by, created_at, updated_at
    ) VALUES (
      v_voucher_id,
      NEW.workspace_id,
      v_voucher_no,
      CURRENT_DATE,
      v_memo,
      v_event_id,
      'posted',
      v_amount,
      v_amount,
      COALESCE(NEW.paid_by, NEW.approved_by),
      NOW(),
      NOW()
    );

    -- 建立分錄
    -- Dr 預付團務成本
    INSERT INTO journal_lines (
      id, voucher_id, line_no, account_id, description,
      debit_amount, credit_amount
    ) VALUES (
      gen_random_uuid(),
      v_voucher_id,
      1,
      v_prepaid_cost_acct_id,
      '預付團務成本',
      v_amount,
      0
    );

    -- Cr 銀行存款
    INSERT INTO journal_lines (
      id, voucher_id, line_no, account_id, description,
      debit_amount, credit_amount
    ) VALUES (
      gen_random_uuid(),
      v_voucher_id,
      2,
      v_bank_acct_id,
      '付款',
      0,
      v_amount
    );

    RAISE NOTICE 'Auto-posted payment request % as voucher %', NEW.code, v_voucher_no;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 5. 建立 Triggers
-- ============================================

-- 收款單自動過帳 Trigger
DROP TRIGGER IF EXISTS trigger_auto_post_receipt ON receipts;
DROP TRIGGER IF EXISTS trigger_auto_post_receipt ON receipts;
CREATE TRIGGER trigger_auto_post_receipt
  AFTER UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_customer_receipt();

-- 請款單自動過帳 Trigger
DROP TRIGGER IF EXISTS trigger_auto_post_payment_request ON payment_requests;
DROP TRIGGER IF EXISTS trigger_auto_post_payment_request ON payment_requests;
CREATE TRIGGER trigger_auto_post_payment_request
  AFTER UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_supplier_payment();

-- ============================================
-- 6. 加入註解說明
-- ============================================

COMMENT ON FUNCTION auto_post_customer_receipt() IS '收款單確認時自動過帳：Dr 銀行/現金, Cr 預收團款';
COMMENT ON FUNCTION auto_post_supplier_payment() IS '請款單確認時自動過帳：Dr 預付團務成本, Cr 銀行存款';
COMMENT ON TRIGGER trigger_auto_post_receipt ON receipts IS '收款單狀態變更為已確認時自動產生傳票';
COMMENT ON TRIGGER trigger_auto_post_payment_request ON payment_requests IS '請款單狀態變更為已確認/已付款時自動產生傳票';

COMMIT;
