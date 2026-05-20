-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 建 corner-website-assets bucket（給 /marketing/website 封面圖用）
-- 2026-05-20  William 拍板（corner-website ERP 整合 spec v1 線 B）
--
-- 用途：
--   存放 Corner 官網的對外圖片：團封面 hero image、SEO og:image 等
--   path convention：tours/<team_code>/hero.png（每團一張封面）
--
-- 為什麼跟 company-assets 分開：
--   - company-assets 是內部用（員工頭像、公司 logo）、路徑會混亂
--   - 對外公開圖檔最好獨立 bucket、未來可加 CDN cache、做防盜鏈、容量計費分開
--
-- 公開讀取（public = true）：
--   官網是 SSG / 對外、Astro 直接從 Supabase public URL 抓圖、不走認證
--
-- ⚠️ 注意：本 migration 還會在 src/app/api/storage/upload/route.ts 的
--   BUCKET_MIME_WHITELIST 加新 key（同 commit 一起）、否則 upload API 會擋下。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'corner-website-assets',
  'corner-website-assets',
  true,
  10485760, -- 10 MB（封面圖可能比較大、留 buffer）
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- 既有 policy 清掉（idempotent）
DROP POLICY IF EXISTS "Public read access for corner website assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload corner website assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete corner website assets" ON storage.objects;

-- 公開讀（官網是 SSG 對外、要能 anon 讀）
CREATE POLICY "Public read access for corner website assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'corner-website-assets');

-- 已登入員工可上傳（capability 守門在 /api/storage/upload 那層做、這層只擋 anon）
CREATE POLICY "Authenticated users can upload corner website assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'corner-website-assets');

-- 已登入員工可刪除（換圖時用）
CREATE POLICY "Authenticated users can delete corner website assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'corner-website-assets');

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP POLICY IF EXISTS "Public read access for corner website assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can upload corner website assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can delete corner website assets" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'corner-website-assets';
-- COMMIT;
