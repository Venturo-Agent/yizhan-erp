-- 建立手冊圖片專用 bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brochure-images',
  'brochure-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 設定公開讀取權限
DROP POLICY IF EXISTS "Public read access for brochure images" ON storage.objects;
CREATE POLICY "Public read access for brochure images"
ON storage.objects FOR SELECT
USING (bucket_id = 'brochure-images');

-- 設定登入用戶上傳權限
DROP POLICY IF EXISTS "Authenticated users can upload brochure images" ON storage.objects;
CREATE POLICY "Authenticated users can upload brochure images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brochure-images'
  AND auth.role() = 'authenticated'
);

-- 設定登入用戶刪除權限
DROP POLICY IF EXISTS "Authenticated users can delete brochure images" ON storage.objects;
CREATE POLICY "Authenticated users can delete brochure images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brochure-images'
  AND auth.role() = 'authenticated'
);
