-- 建立企業聯絡人表
BEGIN;

CREATE TABLE IF NOT EXISTS public.company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  title TEXT,
  department TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  line_id TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON public.company_contacts(company_id);
ALTER TABLE public.company_contacts DISABLE ROW LEVEL SECURITY;

COMMIT;
