-- ============================================
-- 直接修復 William 的 supabase_user_id
-- ============================================
-- 使用 employee_number + display_name 來定位
-- ============================================

BEGIN;

-- 更新 William 的 supabase_user_id（只在 auth user 存在時更新）
-- Auth User ID: 099a709d-ba03-4bcf-afa9-d6c332d7c052
UPDATE public.employees
SET supabase_user_id = '099a709d-ba03-4bcf-afa9-d6c332d7c052'
WHERE employee_number = 'E001'
  AND display_name = 'William'
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = '099a709d-ba03-4bcf-afa9-d6c332d7c052');

COMMIT;

-- 驗證結果
DO $$
DECLARE
  v_supabase_uid TEXT;
BEGIN
  SELECT supabase_user_id INTO v_supabase_uid
  FROM public.employees
  WHERE employee_number = 'E001'
    AND display_name = 'William';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF v_supabase_uid = '099a709d-ba03-4bcf-afa9-d6c332d7c052' THEN
    RAISE NOTICE '✅ William 的 supabase_user_id 已正確設定';
    RAISE NOTICE '   supabase_user_id: %', v_supabase_uid;
  ELSE
    RAISE NOTICE '❌ 更新失敗！當前值: %', COALESCE(v_supabase_uid, 'NULL');
  END IF;
  RAISE NOTICE '========================================';
END $$;
