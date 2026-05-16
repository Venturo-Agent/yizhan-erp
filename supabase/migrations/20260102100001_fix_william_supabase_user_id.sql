-- 修正 William 的 supabase_user_id（僅在 user 存在時執行）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '099a709d-ba03-4bcf-afa9-d6c332d7c052') THEN
    UPDATE public.employees
    SET supabase_user_id = '099a709d-ba03-4bcf-afa9-d6c332d7c052'
    WHERE employee_number = 'E001' AND display_name = 'William';
  END IF;
END $$;
