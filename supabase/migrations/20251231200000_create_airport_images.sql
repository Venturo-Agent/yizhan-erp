-- =============================================
-- 建立機場圖片庫表
-- 用於管理各機場（城市）的封面圖片
-- 支援無限數量圖片、季節/主題分類
-- =============================================

-- 建立機場圖片表
CREATE TABLE IF NOT EXISTS public.airport_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_code text NOT NULL,                    -- 機場代碼如 CNX, BKK, HND
  image_url text NOT NULL,                       -- 圖片 URL
  label text,                                    -- 標籤名稱（如「春季櫻花」「夏季祭典」「寺廟主題」）
  season text CHECK (season IN ('spring', 'summer', 'autumn', 'winter', 'all')),  -- 季節分類
  is_default boolean DEFAULT false,              -- 是否為預設圖片
  display_order integer DEFAULT 0,               -- 排序順序
  uploaded_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,  -- 上傳者
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE, -- 工作區
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_airport_images_airport_code ON public.airport_images(airport_code);
CREATE INDEX IF NOT EXISTS idx_airport_images_workspace ON public.airport_images(workspace_id);
CREATE INDEX IF NOT EXISTS idx_airport_images_season ON public.airport_images(season);

-- 添加註解
COMMENT ON TABLE public.airport_images IS '機場圖片庫 - 管理各機場/城市的封面圖片';
COMMENT ON COLUMN public.airport_images.airport_code IS '機場代碼（如 CNX=清邁, BKK=曼谷, HND=東京羽田）';
COMMENT ON COLUMN public.airport_images.label IS '圖片標籤/主題名稱';
COMMENT ON COLUMN public.airport_images.season IS '季節分類：spring/summer/autumn/winter/all';
COMMENT ON COLUMN public.airport_images.is_default IS '是否為該機場的預設圖片';

-- 啟用 RLS
ALTER TABLE public.airport_images ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DROP POLICY IF EXISTS "airport_images_select" ON public.airport_images;
CREATE POLICY "airport_images_select" ON public.airport_images FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "airport_images_insert" ON public.airport_images;
CREATE POLICY "airport_images_insert" ON public.airport_images FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "airport_images_update" ON public.airport_images;
CREATE POLICY "airport_images_update" ON public.airport_images FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "airport_images_delete" ON public.airport_images;
CREATE POLICY "airport_images_delete" ON public.airport_images FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 建立 updated_at 自動更新觸發器
CREATE OR REPLACE FUNCTION update_airport_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_airport_images_updated_at ON public.airport_images;
CREATE TRIGGER trigger_airport_images_updated_at
  BEFORE UPDATE ON public.airport_images
  FOR EACH ROW
  EXECUTE FUNCTION update_airport_images_updated_at();

-- Done
