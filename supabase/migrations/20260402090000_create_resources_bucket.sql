-- 建立資源（景點/酒店/餐廳）圖片 bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 公開讀取
DROP POLICY IF EXISTS "Public read access for resources" ON storage.objects;
CREATE POLICY "Public read access for resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');

-- 登入用戶可上傳
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
CREATE POLICY "Authenticated users can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources'
  AND auth.role() = 'authenticated'
);

-- 登入用戶可刪除
DROP POLICY IF EXISTS "Authenticated users can delete resources" ON storage.objects;
CREATE POLICY "Authenticated users can delete resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources'
  AND auth.role() = 'authenticated'
);

-- 登入用戶可更新（覆蓋）
DROP POLICY IF EXISTS "Authenticated users can update resources" ON storage.objects;
CREATE POLICY "Authenticated users can update resources"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resources'
  AND auth.role() = 'authenticated'
);
