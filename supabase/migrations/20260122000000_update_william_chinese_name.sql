-- ============================================
-- 更新 William 的中文名稱
-- ============================================

BEGIN;

UPDATE public.employees
SET chinese_name = '簡瑋廷',
    updated_at = now()
WHERE employee_number = 'E001'
  AND display_name = 'William';

COMMIT;
