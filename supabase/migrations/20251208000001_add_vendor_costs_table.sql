-- 新增代辦商成本表（記住代辦商+簽證類型的成本）
BEGIN;

-- 1. 建立 vendor_costs 表格
CREATE TABLE IF NOT EXISTS public.vendor_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  visa_type text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 唯一約束：每個代辦商+簽證類型只能有一筆記錄
  CONSTRAINT vendor_costs_unique UNIQUE (vendor_name, visa_type)
);

-- 2. 在 visas 表新增 vendor 欄位
ALTER TABLE public.visas
ADD COLUMN IF NOT EXISTS vendor text;

COMMENT ON TABLE public.vendor_costs IS '代辦商成本記錄（記住每個代辦商的各類型簽證成本）';
COMMENT ON COLUMN public.vendor_costs.vendor_name IS '代辦商名稱';
COMMENT ON COLUMN public.vendor_costs.visa_type IS '簽證類型（護照 成人、台胞證等）';
COMMENT ON COLUMN public.vendor_costs.cost IS '成本價格';
COMMENT ON COLUMN public.visas.vendor IS '代辦商名稱（送件時填寫）';

-- 3. 禁用 RLS（內部系統）
ALTER TABLE public.vendor_costs DISABLE ROW LEVEL SECURITY;

COMMIT;
