-- 建立 city-backgrounds storage bucket（用於行程表封面圖片）
-- 此 bucket 已被 ImageUploader 組件使用
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'city-backgrounds',
  'city-backgrounds',
  true,  -- 公開可讀
  10485760,  -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 公開讀取政策
DROP POLICY IF EXISTS "city_backgrounds_public_read" ON storage.objects;
CREATE POLICY "city_backgrounds_public_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'city-backgrounds');

-- 允許登入使用者上傳（RLS 檢查 auth）
DROP POLICY IF EXISTS "city_backgrounds_upload" ON storage.objects;
CREATE POLICY "city_backgrounds_upload" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'city-backgrounds'
  AND auth.role() = 'authenticated'
);

-- 允許登入使用者更新自己上傳的檔案
DROP POLICY IF EXISTS "city_backgrounds_update" ON storage.objects;
CREATE POLICY "city_backgrounds_update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'city-backgrounds'
  AND auth.role() = 'authenticated'
);

-- 允許登入使用者刪除
DROP POLICY IF EXISTS "city_backgrounds_delete" ON storage.objects;
CREATE POLICY "city_backgrounds_delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'city-backgrounds'
  AND auth.role() = 'authenticated'
);
