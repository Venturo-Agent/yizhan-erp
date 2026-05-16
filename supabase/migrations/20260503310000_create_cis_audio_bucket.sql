-- ============================================================================
-- 20260503310000_create_cis_audio_bucket.sql
--
-- 建 cis-audio storage bucket（拜訪錄音）
-- private bucket、只給 authenticated 上傳/讀取（搭配 cis.visits.write capability）
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cis-audio',
  'cis-audio',
  false,
  52428800, -- 50MB（一場拜訪錄音通常 < 50MB）
  ARRAY[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "cis_audio_select" ON storage.objects;
CREATE POLICY "cis_audio_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cis-audio');

DROP POLICY IF EXISTS "cis_audio_insert" ON storage.objects;
CREATE POLICY "cis_audio_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cis-audio');

DROP POLICY IF EXISTS "cis_audio_update" ON storage.objects;
CREATE POLICY "cis_audio_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cis-audio');

DROP POLICY IF EXISTS "cis_audio_delete" ON storage.objects;
CREATE POLICY "cis_audio_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cis-audio');
