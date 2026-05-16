-- 更新 company_assets 資料表結構
-- 將 category 改為 asset_type（文件/圖片/影片）

-- 1. 新增 asset_type 欄位
ALTER TABLE public.company_assets
ADD COLUMN IF NOT EXISTS asset_type text DEFAULT 'image';

-- 2. 將舊資料的 category 轉換為 asset_type（僅在 category 欄位存在時）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_assets' AND column_name = 'category') THEN
    UPDATE public.company_assets
    SET asset_type = CASE
      WHEN category IN ('logos', 'seals', 'illustrations') THEN 'image'
      WHEN category = 'documents' THEN 'document'
      ELSE 'image'
    END
    WHERE asset_type IS NULL OR asset_type = 'image';
  END IF;
END $$;

-- 3. 移除舊的 category 欄位（如果存在）
ALTER TABLE public.company_assets
DROP COLUMN IF EXISTS category;

-- 4. 設定 asset_type 的 check constraint
ALTER TABLE public.company_assets
DROP CONSTRAINT IF EXISTS company_assets_asset_type_check;

ALTER TABLE public.company_assets
ADD CONSTRAINT company_assets_asset_type_check
CHECK (asset_type IN ('document', 'image', 'video'));

COMMENT ON COLUMN public.company_assets.asset_type IS '檔案類型: document(文件), image(圖片), video(影片)';
