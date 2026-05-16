-- ============================================
-- Add AVIF support to storage buckets
-- ============================================
-- 日期: 2025-12-30
-- 目的: 新增 image/avif 格式支援

BEGIN;

-- 更新 city-backgrounds bucket 支援 AVIF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/avif']
WHERE id = 'city-backgrounds';

-- 更新 workspace-files bucket 支援 AVIF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'application/pdf']
WHERE id = 'workspace-files';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Added AVIF support to storage buckets';
END $$;
