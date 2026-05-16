-- Migration: 增加 company-assets bucket 的檔案大小限制
-- 從 5MB 增加到 50MB，以支援大型文件上傳

BEGIN;

-- 增加檔案大小限制到 50MB
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB
WHERE id = 'company-assets';

-- 驗證更新
DO $$
DECLARE
  new_limit integer;
BEGIN
  SELECT file_size_limit INTO new_limit
  FROM storage.buckets
  WHERE id = 'company-assets';

  IF new_limit != 52428800 THEN
    RAISE EXCEPTION 'Migration 失敗：file_size_limit 未正確更新';
  END IF;

  RAISE NOTICE '✅ company-assets bucket 檔案大小限制已增加到 50MB';
END $$;

COMMIT;
