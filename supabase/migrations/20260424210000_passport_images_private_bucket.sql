-- =============================================
-- Migration: passport-images bucket 改 private + DB 存 bare filename
-- Date: 2026-04-24
--
-- 目的：
--   護照是敏感個資，原本 bucket public + DB 存整個 signed URL（10 年過期）
--   → 任何人拿到 URL 都能看、網址外洩風險高
--
-- 新制：
--   1. bucket 改 private
--   2. DB 只存 bare filename（例：passport_XXX.jpg）
--   3. 顯示時前端動態簽 15 分鐘 URL（createSignedUrl）
--   4. RLS policy 只讓 authenticated user 讀 / 寫 passport-images bucket
--
-- 配套 code 已 deploy commit 4f55335ea。
-- =============================================

BEGIN;

-- 1. Disable triggers that may block batch UPDATE
ALTER TABLE public.order_members DISABLE TRIGGER tg_lock_order_members_ongoing;

-- 2. Migrate order_members.passport_image_url → bare filename
UPDATE public.order_members
SET passport_image_url = substring(passport_image_url from 'passport-images/([^?]+)')
WHERE passport_image_url IS NOT NULL
  AND passport_image_url LIKE '%passport-images/%'
  AND passport_image_url NOT LIKE 'data:%';

-- 3. Migrate customers.passport_image_url → bare filename
UPDATE public.customers
SET passport_image_url = substring(passport_image_url from 'passport-images/([^?]+)')
WHERE passport_image_url IS NOT NULL
  AND passport_image_url LIKE '%passport-images/%'
  AND passport_image_url NOT LIKE 'data:%';

-- 4. Re-enable trigger
ALTER TABLE public.order_members ENABLE TRIGGER tg_lock_order_members_ongoing;

-- 5. Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'passport-images';

-- 6. RLS policies for passport-images bucket
-- 先砍舊 policies（含公開讀取這條危險的、任何人都能看護照）
DROP POLICY IF EXISTS "authenticated_select_passport_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_passport_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_passport_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_passport_images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for passport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload passport images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete passport images" ON storage.objects;

CREATE POLICY "authenticated_select_passport_images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'passport-images');

CREATE POLICY "authenticated_insert_passport_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'passport-images');

CREATE POLICY "authenticated_update_passport_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'passport-images');

CREATE POLICY "authenticated_delete_passport_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'passport-images');

-- 7. 驗證
DO $$
DECLARE
  om_url_left int;
  c_url_left int;
  bucket_public boolean;
  policy_count int;
BEGIN
  SELECT count(*) INTO om_url_left FROM public.order_members
  WHERE passport_image_url LIKE '%passport-images/%' AND passport_image_url NOT LIKE 'data:%';

  SELECT count(*) INTO c_url_left FROM public.customers
  WHERE passport_image_url LIKE '%passport-images/%' AND passport_image_url NOT LIKE 'data:%';

  SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'passport-images';

  SELECT count(*) INTO policy_count FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname LIKE '%_passport_images';

  IF om_url_left > 0 THEN RAISE EXCEPTION 'order_members 還有 % 筆完整 URL 沒遷移', om_url_left; END IF;
  IF c_url_left > 0 THEN RAISE EXCEPTION 'customers 還有 % 筆完整 URL 沒遷移', c_url_left; END IF;
  IF bucket_public THEN RAISE EXCEPTION 'bucket 還是 public、沒改成 private'; END IF;
  IF policy_count <> 4 THEN RAISE EXCEPTION 'policies 應該 4 條、實際 %', policy_count; END IF;
END $$;

COMMIT;
