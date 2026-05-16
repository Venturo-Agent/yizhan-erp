-- 建立 member-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-documents',
  'member-documents',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 設定 storage policy 允許上傳和讀取
-- 先刪除舊 policy（如果存在）
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;

-- 建立新 policy
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'member-documents');

DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'member-documents');

DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
CREATE POLICY "Allow authenticated users to update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'member-documents');

DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'member-documents');
