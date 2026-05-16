-- 新增簽證預計下件日期欄位
BEGIN;

ALTER TABLE public.visas
ADD COLUMN IF NOT EXISTS expected_issue_date DATE;

COMMENT ON COLUMN public.visas.expected_issue_date IS '預計下件日期';

ALTER TABLE public.visas
ADD COLUMN IF NOT EXISTS actual_submission_date DATE;

COMMENT ON COLUMN public.visas.actual_submission_date IS '實際送件日期（勾選送件後記錄）';

COMMIT;
