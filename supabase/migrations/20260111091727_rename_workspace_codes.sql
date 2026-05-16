-- =============================================
-- Migration: 公司代號改名
-- TP → corner
-- TC → cornertc
-- UTOUR → utour
-- =============================================

BEGIN;

-- 更新 workspace 代號（大小寫不敏感匹配，統一改為小寫）
UPDATE public.workspaces
SET code = 'corner'
WHERE UPPER(code) = 'TP';

UPDATE public.workspaces
SET code = 'cornertc'
WHERE UPPER(code) = 'TC';

UPDATE public.workspaces
SET code = 'utour'
WHERE UPPER(code) = 'UTOUR';

-- 記錄變更
DO $$
BEGIN
  RAISE NOTICE 'Workspace codes updated: TP→corner, TC→cornertc, UTOUR→utour';
END $$;

COMMIT;
