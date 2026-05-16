-- ============================================
-- Fix bucket mime types with proper AVIF support
-- ============================================
-- 日期: 2025-12-30

BEGIN;

-- 使用 INSERT ON CONFLICT DO UPDATE 確保更新 mime types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'city-backgrounds',
  'city-backgrounds',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/avif'];

-- workspace-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'application/pdf'];

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Bucket mime types updated with AVIF support';
END $$;
