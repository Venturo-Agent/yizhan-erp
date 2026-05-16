-- 建立 suppliers 表
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  password_hash TEXT,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50),
  supplier_type_code VARCHAR(30),
  contact_person VARCHAR(50),
  phone VARCHAR(30),
  mobile VARCHAR(30),
  email VARCHAR(100),
  line_id VARCHAR(50),
  wechat_id VARCHAR(50),
  country VARCHAR(50),
  city VARCHAR(50),
  address TEXT,
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account VARCHAR(50),
  bank_account_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_workspace ON public.suppliers(workspace_id);

ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
