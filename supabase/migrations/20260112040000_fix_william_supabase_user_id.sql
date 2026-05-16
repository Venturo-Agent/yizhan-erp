-- ============================================
-- 修復 William 的 supabase_user_id
-- ============================================
-- 問題：員工的 supabase_user_id 設成了 employee.id
--       應該是 Supabase Auth 的 user.id
-- ============================================

BEGIN;

-- 更新 William (E001 at corner workspace) 的 supabase_user_id
UPDATE public.employees
SET supabase_user_id = '099a709d-ba03-4bcf-afa9-d6c332d7c052'
WHERE employee_number = 'E001'
  AND id = '35880209-6a0f-4e9b-a8b4-4df3c6b9c8d2';

-- 同時更新 auth.users 的 metadata
-- 注意：這需要透過 Supabase Admin API 來做，SQL 無法直接改
-- 但我們可以確保 employees 表是正確的

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ William 的 supabase_user_id 已修復';
  RAISE NOTICE '   Auth ID: 099a709d-ba03-4bcf-afa9-d6c332d7c052';
  RAISE NOTICE '========================================';
END $$;
