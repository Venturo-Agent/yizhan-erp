-- =============================================
-- ROLLBACK: 職務名稱還原「系統主管」→「管理員」
-- Date: 2026-04-24
--
-- 用途：如果 cleanup 改名造成業務問題、執行此檔還原。
-- =============================================

BEGIN;

UPDATE public.workspace_roles
SET name = '管理員',
    updated_at = now()
WHERE name = '系統主管';

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM public.workspace_roles WHERE name = '系統主管';
  IF remaining > 0 THEN
    RAISE EXCEPTION 'Rollback 失敗：預期 0 個 "系統主管" row 殘留、實際 %', remaining;
  END IF;
END $$;

COMMIT;
