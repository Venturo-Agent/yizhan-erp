-- 新增 passport_image_url 欄位到 members 表格
BEGIN;

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS passport_image_url text;

COMMENT ON COLUMN public.members.passport_image_url IS 'URL of the passport image stored in Supabase Storage';

COMMIT;
