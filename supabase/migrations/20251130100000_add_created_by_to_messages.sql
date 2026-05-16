-- 為 messages 表添加 created_by 和 updated_by 欄位
BEGIN;

-- 添加 created_by 欄位
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id);

-- 添加 updated_by 欄位
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.employees(id);

COMMIT;
