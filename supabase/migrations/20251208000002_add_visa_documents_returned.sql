-- 新增證件歸還時間欄位
BEGIN;

ALTER TABLE public.visas
ADD COLUMN IF NOT EXISTS documents_returned_date date;

COMMENT ON COLUMN public.visas.documents_returned_date IS '證件歸還時間（代辦商先還證件，護照還沒下來）';

COMMIT;
