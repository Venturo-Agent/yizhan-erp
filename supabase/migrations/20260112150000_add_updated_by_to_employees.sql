-- 為 employees 表格添加 updated_by 欄位
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.employees(id);

COMMENT ON COLUMN public.employees.updated_by IS '最後更新者';
