ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.employees.created_by IS '建立此員工記錄的員工 ID';
