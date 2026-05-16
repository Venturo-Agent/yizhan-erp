-- 新增 timebox_boxes 的 default_content 欄位
BEGIN;

ALTER TABLE public.timebox_boxes
ADD COLUMN IF NOT EXISTS "default_content" jsonb DEFAULT NULL;

COMMENT ON COLUMN public.timebox_boxes."default_content" IS 'Default content for the box (workout exercises, reminder text, etc.)';

COMMIT;
