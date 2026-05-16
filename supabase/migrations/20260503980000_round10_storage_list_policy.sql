-- Round 10：storage public bucket 加 LIST policy 限 authenticated
-- 修補 advisor public_bucket_allows_listing
--
-- 6 個 public bucket 沒 storage.objects RLS policy 限 SELECT/LIST：
--   attractions / avatars / chat-files / company-assets / tour-hotels / user-avatars
-- → anon 透過 client SDK 可以 list 整個 bucket 看所有檔名/路徑
--
-- 修法：加一條 SELECT policy 限 authenticated、不影響 public URL 直接讀檔
-- 即：file 內容仍公開（透過 public URL 讀）、但 anon 不能列整個 bucket

DROP POLICY IF EXISTS "list_authenticated_naked_public_buckets" ON storage.objects;
CREATE POLICY "list_authenticated_naked_public_buckets" ON storage.objects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    bucket_id IN (
      'attractions',
      'avatars',
      'chat-files',
      'company-assets',
      'tour-hotels',
      'user-avatars'
    )
  );
