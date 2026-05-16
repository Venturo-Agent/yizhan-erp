-- 新增公司設定欄位
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS employee_number_prefix VARCHAR(10) DEFAULT 'E',
ADD COLUMN IF NOT EXISTS default_password VARCHAR(50) DEFAULT '1234';

COMMENT ON COLUMN public.workspaces.employee_number_prefix IS '員工編號前綴，例如 E, TP, JY';
COMMENT ON COLUMN public.workspaces.default_password IS '新員工預設密碼';

-- 設定現有公司的預設值
UPDATE public.workspaces SET employee_number_prefix = 'E' WHERE employee_number_prefix IS NULL;
UPDATE public.workspaces SET default_password = '1234' WHERE default_password IS NULL;
