-- ============================================
-- Fix Storage RLS Policies
-- ============================================
-- 日期: 2025-12-15
-- 目的: 確保 workspace-files bucket 的上傳權限正確

BEGIN;

-- 先確認 bucket 存在
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 刪除舊的 storage policies（如果存在）
DROP POLICY IF EXISTS "workspace_files_select" ON storage.objects;
DROP POLICY IF EXISTS "workspace_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "workspace_files_update" ON storage.objects;
DROP POLICY IF EXISTS "workspace_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- 建立新的 storage policies

-- 1. 公開讀取（因為是公開 bucket）
CREATE POLICY "workspace_files_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-files');

-- 2. 已認證用戶可以上傳
CREATE POLICY "workspace_files_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workspace-files');

-- 3. 已認證用戶可以更新
CREATE POLICY "workspace_files_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'workspace-files');

-- 4. 已認證用戶可以刪除
CREATE POLICY "workspace_files_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workspace-files');

COMMIT;

-- 輸出確認訊息
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Storage RLS Policies Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📁 Bucket: workspace-files';
  RAISE NOTICE '  • Public: Yes';
  RAISE NOTICE '  • Max file size: 50MB';
  RAISE NOTICE '  • Allowed types: image/*, pdf';
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Policies:';
  RAISE NOTICE '  • SELECT: Public (anyone can view)';
  RAISE NOTICE '  • INSERT: Authenticated users only';
  RAISE NOTICE '  • UPDATE: Authenticated users only';
  RAISE NOTICE '  • DELETE: Authenticated users only';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
