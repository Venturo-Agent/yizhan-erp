-- 為 order_members 表格新增 passport_image_url 欄位
-- 用於儲存護照 OCR 辨識時上傳的圖片 URL

BEGIN;

-- 檢查並新增欄位（如果不存在）
ALTER TABLE public.order_members
ADD COLUMN IF NOT EXISTS passport_image_url TEXT;

COMMENT ON COLUMN public.order_members.passport_image_url IS '護照圖片 URL（OCR 辨識用）';

COMMIT;
