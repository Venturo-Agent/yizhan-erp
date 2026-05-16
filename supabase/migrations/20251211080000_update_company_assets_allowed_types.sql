-- Migration: 更新 company-assets bucket 允許的檔案類型和檔案大小限制
-- 新增 PDF、Word、Excel、PowerPoint、文字檔等常見文件格式
-- 增加檔案大小限制到 50MB

BEGIN;

-- 更新 company-assets bucket 的 allowed_mime_types 和 file_size_limit
UPDATE storage.buckets
SET
  file_size_limit = 52428800,  -- 50MB（原本是 5MB）
  allowed_mime_types = ARRAY[
  -- 圖片格式
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/gif',
  -- PDF 文件
  'application/pdf',
  -- Microsoft Office 格式
  'application/msword',                                                           -- .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',     -- .docx
  'application/vnd.ms-excel',                                                     -- .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',           -- .xlsx
  'application/vnd.ms-powerpoint',                                                -- .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',   -- .pptx
  -- 文字檔
  'text/plain',                                                                   -- .txt
  'text/csv',                                                                     -- .csv
  -- 壓縮檔
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
]
WHERE id = 'company-assets';

-- 驗證更新
DO $$
DECLARE
  mime_types text[];
BEGIN
  SELECT allowed_mime_types INTO mime_types
  FROM storage.buckets
  WHERE id = 'company-assets';

  IF mime_types IS NULL OR array_length(mime_types, 1) < 10 THEN
    RAISE EXCEPTION 'Migration 失敗：allowed_mime_types 未正確更新';
  END IF;

  RAISE NOTICE '✅ company-assets bucket 已更新，現在支援 % 種檔案格式', array_length(mime_types, 1);
END $$;

COMMIT;
