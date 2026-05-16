-- ════════════════════════════════════════════════════════════════════════
-- Create missing storage bucket: company-assets
--
-- 5/14：公司設定 logo 上傳撞「Bucket not found」
-- user-avatars 5/9 已建（5MB / image/jpeg|png|gif|webp）
-- company-assets 缺、補建（10MB / image/png|jpeg|jpg|webp|svg+xml）
--
-- Apply 方式：跑 supabase CLI 或用 storage REST API（5/14 已用 REST 直建、本檔留底）
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('company-assets', 'company-assets', true, 10485760,
   ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
