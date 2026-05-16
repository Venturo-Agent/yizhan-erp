-- 完整會計系統建置（一次執行所有必要表格）
-- 執行日期：2026-03-19
-- 用途：建立所有會計相關表格


-- ============================================
-- 1. 會計科目表 (Chart of Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cost')),
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  is_system_locked boolean DEFAULT false,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, code)
);

COMMENT ON TABLE public.chart_of_accounts IS '會計科目表';

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_workspace ON public.chart_of_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chart_of_accounts_select" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_select" ON public.chart_of_accounts FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "chart_of_accounts_insert" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_insert" ON public.chart_of_accounts FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "chart_of_accounts_update" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_update" ON public.chart_of_accounts FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "chart_of_accounts_delete" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_delete" ON public.chart_of_accounts FOR DELETE
USING (workspace_id = get_current_user_workspace() AND is_system_locked = false);

-- ============================================
-- 2. 銀行帳戶
-- ============================================
CREATE TABLE IF NOT EXISTS public.erp_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  name text NOT NULL,
  bank_name text,
  account_number text,
  account_id uuid REFERENCES public.chart_of_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.erp_bank_accounts IS '銀行帳戶';

CREATE INDEX IF NOT EXISTS idx_erp_bank_accounts_workspace ON public.erp_bank_accounts(workspace_id);

ALTER TABLE public.erp_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_bank_accounts_select" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_select" ON public.erp_bank_accounts FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "erp_bank_accounts_insert" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_insert" ON public.erp_bank_accounts FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "erp_bank_accounts_update" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_update" ON public.erp_bank_accounts FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 3. 會計事件 (Accounting Events)
-- ============================================
DO $$ BEGIN
  CREATE TYPE accounting_event_type AS ENUM (
    'customer_receipt_posted',
    'supplier_payment_posted',
    'group_settlement_posted',
    'bonus_paid',
    'tax_paid',
    'manual_voucher'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE accounting_event_status AS ENUM ('posted', 'reversed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.accounting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  event_type accounting_event_type NOT NULL,
  source_type text,
  source_id uuid,
  group_id uuid,
  tour_id text REFERENCES public.tours(id),
  event_date date NOT NULL,
  currency text DEFAULT 'TWD',
  meta jsonb DEFAULT '{}',
  status accounting_event_status DEFAULT 'posted',
  reversal_event_id uuid REFERENCES public.accounting_events(id),
  memo text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.accounting_events IS '會計事件';

CREATE INDEX IF NOT EXISTS idx_accounting_events_workspace ON public.accounting_events(workspace_id);

ALTER TABLE public.accounting_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_events_select" ON public.accounting_events;
CREATE POLICY "accounting_events_select" ON public.accounting_events FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 4. 傳票頭 (Journal Vouchers)
-- ============================================
DO $$ BEGIN
  CREATE TYPE voucher_status AS ENUM ('draft', 'posted', 'reversed', 'locked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.journal_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  voucher_no text NOT NULL,
  voucher_date date NOT NULL,
  memo text,
  company_unit text DEFAULT 'DEFAULT',
  event_id uuid REFERENCES public.accounting_events(id) UNIQUE,
  status voucher_status DEFAULT 'posted',
  total_debit numeric(15,2) DEFAULT 0,
  total_credit numeric(15,2) DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, voucher_no)
);

COMMENT ON TABLE public.journal_vouchers IS '會計傳票';

CREATE INDEX IF NOT EXISTS idx_journal_vouchers_workspace ON public.journal_vouchers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_date ON public.journal_vouchers(voucher_date);

ALTER TABLE public.journal_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_vouchers_select" ON public.journal_vouchers;
CREATE POLICY "journal_vouchers_select" ON public.journal_vouchers FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "journal_vouchers_insert" ON public.journal_vouchers;
CREATE POLICY "journal_vouchers_insert" ON public.journal_vouchers FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "journal_vouchers_update" ON public.journal_vouchers;
CREATE POLICY "journal_vouchers_update" ON public.journal_vouchers FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 5. 分錄明細 (Journal Lines)
-- ============================================
DO $$ BEGIN
  CREATE TYPE subledger_type AS ENUM ('customer', 'supplier', 'bank', 'group', 'employee');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid REFERENCES public.journal_vouchers(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  account_id uuid REFERENCES public.chart_of_accounts(id),
  subledger_type subledger_type,
  subledger_id uuid,
  description text,
  debit_amount numeric(15,2) DEFAULT 0,
  credit_amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.journal_lines IS '傳票分錄明細';

CREATE INDEX IF NOT EXISTS idx_journal_lines_voucher ON public.journal_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_id);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_lines_select" ON public.journal_lines;
CREATE POLICY "journal_lines_select" ON public.journal_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.journal_vouchers jv
    WHERE jv.id = journal_lines.voucher_id
    AND (jv.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

DROP POLICY IF EXISTS "journal_lines_insert" ON public.journal_lines;
CREATE POLICY "journal_lines_insert" ON public.journal_lines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_vouchers jv
    WHERE jv.id = journal_lines.voucher_id
    AND jv.workspace_id = get_current_user_workspace()
  )
);

-- ============================================
-- 6. 過帳規則
-- ============================================
CREATE TABLE IF NOT EXISTS public.posting_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  event_type accounting_event_type NOT NULL,
  rule_name text NOT NULL,
  rule_config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.posting_rules IS '過帳規則配置';

ALTER TABLE public.posting_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posting_rules_select" ON public.posting_rules;
CREATE POLICY "posting_rules_select" ON public.posting_rules FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 7. 會計期間
-- ============================================
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.accounting_periods IS '會計期間（用於關帳）';

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_periods_select" ON public.accounting_periods;
CREATE POLICY "accounting_periods_select" ON public.accounting_periods FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 8. 期末結轉記錄
-- ============================================
CREATE TABLE IF NOT EXISTS public.accounting_period_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_type varchar(10) NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  closing_voucher_id uuid REFERENCES public.journal_vouchers(id),
  net_income numeric(15,2) NOT NULL DEFAULT 0,
  closed_by uuid REFERENCES public.employees(id),
  closed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, period_type, period_start, period_end)
);

COMMENT ON TABLE public.accounting_period_closings IS '會計期末結轉記錄';

CREATE INDEX IF NOT EXISTS idx_accounting_period_closings_workspace ON public.accounting_period_closings(workspace_id);

ALTER TABLE public.accounting_period_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_period_closings_select" ON public.accounting_period_closings;
CREATE POLICY "accounting_period_closings_select" ON public.accounting_period_closings FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "accounting_period_closings_insert" ON public.accounting_period_closings;
CREATE POLICY "accounting_period_closings_insert" ON public.accounting_period_closings FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

-- ============================================
-- 9. 票據管理
-- ============================================
CREATE TABLE IF NOT EXISTS public.checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) NOT NULL,
  check_number text NOT NULL,
  check_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  bank_account_id uuid REFERENCES public.erp_bank_accounts(id),
  payee_type text CHECK (payee_type IN ('supplier', 'employee', 'other')),
  payee_id uuid,
  payee_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'voided', 'bounced')),
  payment_request_id uuid REFERENCES public.payment_requests(id),
  voucher_id uuid,
  memo text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, check_number)
);

COMMENT ON TABLE public.checks IS '票據/支票管理';

CREATE INDEX IF NOT EXISTS idx_checks_workspace ON public.checks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checks_due_date ON public.checks(due_date);

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checks_select" ON public.checks;
CREATE POLICY "checks_select" ON public.checks FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "checks_insert" ON public.checks;
CREATE POLICY "checks_insert" ON public.checks FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "checks_update" ON public.checks;
CREATE POLICY "checks_update" ON public.checks FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 10. 關聯欄位（payments/payment_requests）
-- ============================================
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS accounting_voucher_id uuid REFERENCES public.journal_vouchers(id);

CREATE INDEX IF NOT EXISTS idx_payments_accounting_voucher ON public.payments(accounting_voucher_id);

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS accounting_voucher_id uuid REFERENCES public.journal_vouchers(id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_accounting_voucher ON public.payment_requests(accounting_voucher_id);

