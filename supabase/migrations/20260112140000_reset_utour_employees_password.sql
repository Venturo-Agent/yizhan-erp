-- 重設 utour 員工密碼為 00000000
-- 密碼 hash: bcrypt('00000000', 12)

BEGIN;

-- 更新 utour workspace 下所有員工的密碼
UPDATE public.employees
SET
  password_hash = '$2b$12$8meX5FVeCxNa0OzmRJJFHewN5RCybQ1uY.7.67UCIdv.BVRVyUth6',
  updated_at = now()
WHERE workspace_id = (
  SELECT id FROM public.workspaces WHERE code = 'utour' LIMIT 1
);

-- 顯示更新結果
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.employees
  WHERE workspace_id = (SELECT id FROM public.workspaces WHERE code = 'utour' LIMIT 1);

  RAISE NOTICE '已重設 utour 員工密碼，共 % 位員工', updated_count;
  RAISE NOTICE '新密碼: 00000000';
END $$;

COMMIT;
