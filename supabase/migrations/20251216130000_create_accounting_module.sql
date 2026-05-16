-- ERP 會計模組 - 資料庫結構
-- 目標：把「收款/付款/結團」等 ERP 事件，自動投影成傳票（Journal Voucher）

BEGIN;

-- ============================================
-- 1. 科目表 (Chart of Accounts) - 使用新表名避免衝突
-- ============================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'revenue', 'expense', 'cost')),
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  is_system_locked boolean DEFAULT false,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, code)
);

COMMENT ON TABLE public.chart_of_accounts IS '會計科目表';
COMMENT ON COLUMN public.chart_of_accounts.account_type IS '科目類型：asset資產/liability負債/revenue收入/expense費用/cost成本';
COMMENT ON COLUMN public.chart_of_accounts.is_system_locked IS '系統科目不可刪改';

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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE accounting_event_status AS ENUM (
    'posted',
    'reversed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
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
COMMENT ON COLUMN public.accounting_events.meta IS '計算參數：手續費率、人數、稅率、獎金明細等';

-- ============================================
-- 4. 傳票頭 (Journal Voucher)
-- ============================================
DO $$ BEGIN
  CREATE TYPE voucher_status AS ENUM (
    'draft',
    'posted',
    'reversed',
    'locked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
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
COMMENT ON COLUMN public.journal_vouchers.company_unit IS '部門/分公司，單一公司模式固定DEFAULT';

-- ============================================
-- 5. 分錄明細 (Journal Lines)
-- ============================================
DO $$ BEGIN
  CREATE TYPE subledger_type AS ENUM (
    'customer',
    'supplier',
    'bank',
    'group',
    'employee'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
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
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.journal_lines IS '傳票分錄明細';

-- ============================================
-- 6. 過帳規則 (Posting Rules)
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

-- ============================================
-- 7. 會計期間 (Accounting Periods)
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
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.accounting_periods IS '會計期間（用於關帳）';

-- ============================================
-- 8. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_workspace ON public.chart_of_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON public.chart_of_accounts(parent_id);

CREATE INDEX IF NOT EXISTS idx_erp_bank_accounts_workspace ON public.erp_bank_accounts(workspace_id);

CREATE INDEX IF NOT EXISTS idx_accounting_events_workspace ON public.accounting_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounting_events_type ON public.accounting_events(event_type);
CREATE INDEX IF NOT EXISTS idx_accounting_events_source ON public.accounting_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_accounting_events_tour ON public.accounting_events(tour_id);
CREATE INDEX IF NOT EXISTS idx_accounting_events_date ON public.accounting_events(event_date);

CREATE INDEX IF NOT EXISTS idx_journal_vouchers_workspace ON public.journal_vouchers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_date ON public.journal_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_status ON public.journal_vouchers(status);

CREATE INDEX IF NOT EXISTS idx_journal_lines_voucher ON public.journal_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_id);

-- ============================================
-- 9. RLS 政策
-- ============================================
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

-- chart_of_accounts policies
DROP POLICY IF EXISTS "chart_of_accounts_select" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_select" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_select" ON public.chart_of_accounts FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "chart_of_accounts_insert" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_insert" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_insert" ON public.chart_of_accounts FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "chart_of_accounts_update" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_update" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_update" ON public.chart_of_accounts FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "chart_of_accounts_delete" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_delete" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_delete" ON public.chart_of_accounts FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- erp_bank_accounts policies
DROP POLICY IF EXISTS "erp_bank_accounts_select" ON public.erp_bank_accounts;
DROP POLICY IF EXISTS "erp_bank_accounts_select" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_select" ON public.erp_bank_accounts FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "erp_bank_accounts_insert" ON public.erp_bank_accounts;
DROP POLICY IF EXISTS "erp_bank_accounts_insert" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_insert" ON public.erp_bank_accounts FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "erp_bank_accounts_update" ON public.erp_bank_accounts;
DROP POLICY IF EXISTS "erp_bank_accounts_update" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_update" ON public.erp_bank_accounts FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "erp_bank_accounts_delete" ON public.erp_bank_accounts;
DROP POLICY IF EXISTS "erp_bank_accounts_delete" ON public.erp_bank_accounts;
CREATE POLICY "erp_bank_accounts_delete" ON public.erp_bank_accounts FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- accounting_events policies
DROP POLICY IF EXISTS "accounting_events_select" ON public.accounting_events;
DROP POLICY IF EXISTS "accounting_events_select" ON public.accounting_events;
CREATE POLICY "accounting_events_select" ON public.accounting_events FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "accounting_events_insert" ON public.accounting_events;
DROP POLICY IF EXISTS "accounting_events_insert" ON public.accounting_events;
CREATE POLICY "accounting_events_insert" ON public.accounting_events FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "accounting_events_update" ON public.accounting_events;
DROP POLICY IF EXISTS "accounting_events_update" ON public.accounting_events;
CREATE POLICY "accounting_events_update" ON public.accounting_events FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- journal_vouchers policies
DROP POLICY IF EXISTS "journal_vouchers_select" ON public.journal_vouchers;
DROP POLICY IF EXISTS "journal_vouchers_select" ON public.journal_vouchers;
CREATE POLICY "journal_vouchers_select" ON public.journal_vouchers FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "journal_vouchers_insert" ON public.journal_vouchers;
DROP POLICY IF EXISTS "journal_vouchers_insert" ON public.journal_vouchers;
CREATE POLICY "journal_vouchers_insert" ON public.journal_vouchers FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "journal_vouchers_update" ON public.journal_vouchers;
DROP POLICY IF EXISTS "journal_vouchers_update" ON public.journal_vouchers;
CREATE POLICY "journal_vouchers_update" ON public.journal_vouchers FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- journal_lines policies
DROP POLICY IF EXISTS "journal_lines_select" ON public.journal_lines;
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
DROP POLICY IF EXISTS "journal_lines_insert" ON public.journal_lines;
CREATE POLICY "journal_lines_insert" ON public.journal_lines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_vouchers jv
    WHERE jv.id = journal_lines.voucher_id
    AND jv.workspace_id = get_current_user_workspace()
  )
);

-- posting_rules policies
DROP POLICY IF EXISTS "posting_rules_select" ON public.posting_rules;
DROP POLICY IF EXISTS "posting_rules_select" ON public.posting_rules;
CREATE POLICY "posting_rules_select" ON public.posting_rules FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "posting_rules_insert" ON public.posting_rules;
DROP POLICY IF EXISTS "posting_rules_insert" ON public.posting_rules;
CREATE POLICY "posting_rules_insert" ON public.posting_rules FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "posting_rules_update" ON public.posting_rules;
DROP POLICY IF EXISTS "posting_rules_update" ON public.posting_rules;
CREATE POLICY "posting_rules_update" ON public.posting_rules FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- accounting_periods policies
DROP POLICY IF EXISTS "accounting_periods_select" ON public.accounting_periods;
DROP POLICY IF EXISTS "accounting_periods_select" ON public.accounting_periods;
CREATE POLICY "accounting_periods_select" ON public.accounting_periods FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "accounting_periods_insert" ON public.accounting_periods;
DROP POLICY IF EXISTS "accounting_periods_insert" ON public.accounting_periods;
CREATE POLICY "accounting_periods_insert" ON public.accounting_periods FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "accounting_periods_update" ON public.accounting_periods;
DROP POLICY IF EXISTS "accounting_periods_update" ON public.accounting_periods;
CREATE POLICY "accounting_periods_update" ON public.accounting_periods FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

COMMIT;
