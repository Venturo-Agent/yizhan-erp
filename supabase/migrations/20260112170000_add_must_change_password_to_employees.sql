-- 為 employees 表格添加 must_change_password 欄位
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.employees.must_change_password IS '是否需要在下次登入時更改密碼';

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';
