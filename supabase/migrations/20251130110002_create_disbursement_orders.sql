-- 建立出納單表
BEGIN;

CREATE TABLE IF NOT EXISTS public.disbursement_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  workspace_id UUID REFERENCES public.workspaces(id),
  payment_request_id UUID,
  supplier_id UUID,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TWD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  payment_method TEXT,
  payment_date DATE,
  bank_account TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'pending',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_disbursement_orders_workspace_id ON public.disbursement_orders(workspace_id);
ALTER TABLE public.disbursement_orders DISABLE ROW LEVEL SECURITY;

COMMIT;
