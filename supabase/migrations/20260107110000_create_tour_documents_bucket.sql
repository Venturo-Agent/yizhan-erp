-- 建立 tour-documents Storage bucket
-- 用於存儲需求單、取消單等文件

BEGIN;

-- 建立 bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-documents',
  'tour-documents',
  true,
  10485760, -- 10MB
  ARRAY['text/html', 'application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies（先刪除再建立）
DROP POLICY IF EXISTS "tour_documents_bucket_select" ON storage.objects;
CREATE POLICY "tour_documents_bucket_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-documents');

DROP POLICY IF EXISTS "tour_documents_bucket_insert" ON storage.objects;
CREATE POLICY "tour_documents_bucket_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tour-documents');

DROP POLICY IF EXISTS "tour_documents_bucket_delete" ON storage.objects;
CREATE POLICY "tour_documents_bucket_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'tour-documents');

COMMIT;
