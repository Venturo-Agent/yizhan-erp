-- 新增 is_public 欄位到 todos 表格
BEGIN;

ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

COMMENT ON COLUMN public.todos.is_public IS '是否公開給全公司（只有建立者+共享者可編輯，其他人只能查看）';

COMMIT;
