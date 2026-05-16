-- ════════════════════════════════════════════════════════════════════════
-- Hotfix: get_current_employee_id() 引用不存在欄位 supabase_user_id
--
-- 問題：
--   function 寫 SELECT id FROM employees WHERE supabase_user_id = auth.uid()
--   但 employees 表欄位是 user_id（不是 supabase_user_id）
--   錯誤：column "e.supabase_user_id" does not exist
--
--   這 function 是所有 channel / channel_members / channel_messages RLS 的核心、
--   throw 就讓整個 channels sidebar 撈不到資料（空陣列）。
--
-- 根因：
--   過去某次 schema rename（supabase_user_id → user_id）沒同步改 function。
--   應用層 audit 抓到 src 沒 supabase_user_id 殘留、但 DB function 漏抓。
--
-- 修法：
--   重寫 function、改用 user_id（也補上 status='active' filter、跟
--   get_current_user_workspace 對齊）。
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════ Rollback ════
-- 不建議 rollback、舊版會炸（column not exist）
