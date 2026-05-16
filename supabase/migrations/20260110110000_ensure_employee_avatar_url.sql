-- 確保 employees 表有 avatar_url 欄位
-- 如果欄位已存在則不做任何事

BEGIN;

-- 添加 avatar_url 欄位（如果不存在）
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_employees_avatar_url
  ON public.employees(avatar_url)
  WHERE avatar_url IS NOT NULL;

-- 添加欄位說明
COMMENT ON COLUMN public.employees.avatar_url IS '用戶頭像 URL（Supabase Storage）';

COMMIT;
