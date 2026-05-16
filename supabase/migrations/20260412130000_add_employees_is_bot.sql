-- ============================================
-- Migration: employees 加 is_bot 欄位
-- 區分機器人帳號（BOT001 等）和真人員工
-- 用於統計、指派、薪資等場景排除機器人
-- Date: 2026-04-12
-- ============================================

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.employees.is_bot IS '是否為機器人帳號（BOT001 等），統計人數/指派選單等場景應排除';

-- 標記現有機器人
UPDATE public.employees
SET is_bot = TRUE
WHERE employee_number LIKE 'BOT%' OR display_name ILIKE '%venturo%機器人%' OR chinese_name ILIKE '%機器人%';

CREATE INDEX IF NOT EXISTS idx_employees_is_bot ON public.employees(workspace_id, is_bot)
  WHERE is_bot = FALSE;

COMMIT;
