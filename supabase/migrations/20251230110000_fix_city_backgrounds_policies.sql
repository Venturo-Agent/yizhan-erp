-- ============================================
-- Fix city-backgrounds Storage Policies
-- ============================================
-- 日期: 2025-12-30
-- 目的: 修正 city-backgrounds bucket 的 RLS 政策格式

BEGIN;

-- 刪除舊的 policies
DROP POLICY IF EXISTS "city_backgrounds_public_read" ON storage.objects;
DROP POLICY IF EXISTS "city_backgrounds_upload" ON storage.objects;
DROP POLICY IF EXISTS "city_backgrounds_update" ON storage.objects;
DROP POLICY IF EXISTS "city_backgrounds_delete" ON storage.objects;

-- 建立新的 storage policies（使用正確的格式）

-- 1. 公開讀取（因為是公開 bucket）
CREATE POLICY "city_backgrounds_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'city-backgrounds');

-- 2. 已認證用戶可以上傳
CREATE POLICY "city_backgrounds_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'city-backgrounds');

-- 3. 已認證用戶可以更新
CREATE POLICY "city_backgrounds_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'city-backgrounds');

-- 4. 已認證用戶可以刪除
CREATE POLICY "city_backgrounds_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'city-backgrounds');

COMMIT;

-- 輸出確認訊息
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ city-backgrounds Storage Policies Fixed!';
  RAISE NOTICE '========================================';
END $$;
