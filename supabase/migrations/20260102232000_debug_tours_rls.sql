-- 暫時測試：讓 tours 的 SELECT 更寬鬆
-- 如果這樣還是 404，問題不在 RLS policy

BEGIN;

DROP POLICY IF EXISTS "tours_select" ON public.tours;

-- 非常寬鬆的 policy：所有登入用戶都能 SELECT
DROP POLICY IF EXISTS "tours_select" ON public.tours;
CREATE POLICY "tours_select" ON public.tours FOR SELECT
USING (auth.uid() IS NOT NULL);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ tours SELECT policy 暫時設為寬鬆模式（測試用）';
END $$;
