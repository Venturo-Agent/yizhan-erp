-- 新增護照圖片欄位到 customers 表格
BEGIN;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS passport_image_url text;

COMMENT ON COLUMN public.customers.passport_image_url IS 'Passport image URL (base64 or storage URL)';

COMMIT;
