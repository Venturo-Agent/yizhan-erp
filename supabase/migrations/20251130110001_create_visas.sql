-- 建立簽證表
BEGIN;

CREATE TABLE IF NOT EXISTS public.visas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  workspace_id UUID REFERENCES public.workspaces(id),
  customer_id TEXT,
  customer_name TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  visa_type TEXT,
  destination_country TEXT,
  entry_type TEXT,
  status TEXT DEFAULT 'pending',
  submitted_date DATE,
  approved_date DATE,
  collected_date DATE,
  tour_id UUID,
  order_id UUID,
  visa_fee DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_visas_workspace_id ON public.visas(workspace_id);
ALTER TABLE public.visas DISABLE ROW LEVEL SECURITY;

COMMIT;
