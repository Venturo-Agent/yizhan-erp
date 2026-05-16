-- 統一 thumbnail 和 images 欄位（僅在 thumbnail 欄位存在時執行）
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['attractions', 'hotels', 'restaurants', 'michelin_restaurants'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'thumbnail') THEN
      EXECUTE format('UPDATE %I SET images = CASE
        WHEN thumbnail IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL) THEN ARRAY[thumbnail]
        WHEN thumbnail IS NOT NULL AND NOT (thumbnail = ANY(images)) THEN ARRAY[thumbnail] || images
        WHEN thumbnail IS NOT NULL AND thumbnail = ANY(images) THEN ARRAY[thumbnail] || array_remove(images, thumbnail)
        ELSE images END, updated_at = now() WHERE thumbnail IS NOT NULL', tbl);
      EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS thumbnail', tbl);
    END IF;
  END LOOP;
END $$;
