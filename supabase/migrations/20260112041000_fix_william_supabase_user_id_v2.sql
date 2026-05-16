-- ============================================
-- 修復 William 的 supabase_user_id (v2)
-- ============================================
-- 使用更精確的條件：employee_number + display_name
-- ============================================

BEGIN;

-- 更新 William (E001, display_name='William') 的 supabase_user_id
-- 使用 corner workspace (code='corner')
UPDATE public.employees e
SET supabase_user_id = '099a709d-ba03-4bcf-afa9-d6c332d7c052'
FROM public.workspaces w
WHERE e.workspace_id = w.id
  AND w.code = 'corner'
  AND e.employee_number = 'E001'
  AND e.display_name = 'William';

COMMIT;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- 檢查更新結果
  SELECT COUNT(*) INTO updated_count
  FROM public.employees e
  JOIN public.workspaces w ON e.workspace_id = w.id
  WHERE w.code = 'corner'
    AND e.employee_number = 'E001'
    AND e.supabase_user_id = '099a709d-ba03-4bcf-afa9-d6c332d7c052';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ William 的 supabase_user_id 已正確設定';
  ELSE
    RAISE NOTICE '⚠️ 找不到符合條件的員工記錄';
  END IF;
  RAISE NOTICE '========================================';
END $$;
