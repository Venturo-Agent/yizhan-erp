-- 建立 passport-images bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passport-images',
  'passport-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 刪除舊的 policy（如果存在）
DROP POLICY IF EXISTS "Public read access for passport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload passport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete passport images" ON storage.objects;

-- 允許任何人讀取（因為是 public bucket）
CREATE POLICY "Public read access for passport images"
ON storage.objects FOR SELECT
USING (bucket_id = 'passport-images');

-- 允許已登入用戶上傳
CREATE POLICY "Authenticated users can upload passport images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'passport-images');

-- 允許已登入用戶刪除
CREATE POLICY "Authenticated users can delete passport images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'passport-images');
