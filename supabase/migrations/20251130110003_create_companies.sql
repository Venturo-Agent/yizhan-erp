-- 建立企業客戶表
BEGIN;

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  workspace_id UUID REFERENCES public.workspaces(id),
  name TEXT NOT NULL,
  name_en TEXT,
  tax_id TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  industry TEXT,
  employee_count INTEGER,
  annual_travel_budget DECIMAL(12,2),
  payment_terms TEXT,
  credit_limit DECIMAL(12,2),
  status TEXT DEFAULT 'active',
  is_vip BOOLEAN DEFAULT FALSE,
  vip_level INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_order_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_companies_workspace_id ON public.companies(workspace_id);
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

COMMIT;
