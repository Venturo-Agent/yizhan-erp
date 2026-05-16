-- 新增 employee_type 欄位
-- 用於區分人類員工和機器人

-- 新增欄位，預設為 'human'
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'human';

-- 添加 CHECK 約束確保只能是 'human' 或 'bot'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_type_check') THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_employee_type_check
    CHECK (employee_type IN ('human', 'bot'));
  END IF;
END $$;

-- 添加註解
COMMENT ON COLUMN public.employees.employee_type IS '員工類型：human（人類）或 bot（機器人）';

-- 將現有 BOT 員工設為 bot 類型
UPDATE public.employees
SET employee_type = 'bot'
WHERE employee_number LIKE 'BOT%'
   OR employee_number LIKE 'bot%'
   OR display_name LIKE '%機器人%'
   OR display_name LIKE '%Bot%'
   OR display_name LIKE '%BOT%';

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';
