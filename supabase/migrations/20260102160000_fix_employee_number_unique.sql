-- 修正員工編號唯一約束
-- 問題：employee_number 是全域唯一，但應該是每個 workspace 內唯一
-- 解決：改為 (workspace_id, employee_number) 複合唯一

BEGIN;

-- 1. 刪除舊的全域唯一約束
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_employee_number_key;

-- 2. 建立新的複合唯一約束（每個 workspace 內 employee_number 唯一）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_workspace_employee_number_unique'
  ) THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_workspace_employee_number_unique
    UNIQUE (workspace_id, employee_number);
  END IF;
END $$;

-- 3. 更新 JY 的員工編號為 E001
UPDATE public.employees
SET employee_number = 'E001'
WHERE workspace_id = (SELECT id FROM public.workspaces WHERE code = 'JY')
  AND chinese_name = '張文林';

COMMIT;
