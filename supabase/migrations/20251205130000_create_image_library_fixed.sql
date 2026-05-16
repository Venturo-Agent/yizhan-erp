-- Migration: Create image_library table (fixed version)
-- Description: 圖庫資料表，用於儲存可重複使用的圖片

BEGIN;

-- 先刪除如果存在
DROP TABLE IF EXISTS public.image_library CASCADE;

-- 建立圖庫資料表
CREATE TABLE public.image_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 圖片基本資訊
  name text NOT NULL,
  description text,
  file_path text NOT NULL,
  public_url text NOT NULL,

  -- 圖片分類
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',

  -- 圖片元數據
  file_size integer,
  width integer,
  height integer,
  mime_type text,

  -- 關聯資訊（可選）- 不使用外鍵以簡化架構
  country_id text,
  city_id text,
  attraction_id uuid,

  -- 審計欄位
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 建立索引
CREATE INDEX idx_image_library_workspace_id ON public.image_library(workspace_id);
CREATE INDEX idx_image_library_category ON public.image_library(category);
CREATE INDEX idx_image_library_country_id ON public.image_library(country_id);
CREATE INDEX idx_image_library_city_id ON public.image_library(city_id);
CREATE INDEX idx_image_library_attraction_id ON public.image_library(attraction_id);
CREATE INDEX idx_image_library_tags ON public.image_library USING GIN(tags);

-- 建立 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_image_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_image_library_updated_at
  BEFORE UPDATE ON public.image_library
  FOR EACH ROW
  EXECUTE FUNCTION update_image_library_updated_at();

-- 禁用 RLS（根據專案規範）
ALTER TABLE public.image_library DISABLE ROW LEVEL SECURITY;

-- 添加表格註解
COMMENT ON TABLE public.image_library IS '圖庫資料表 - 儲存可重複使用的圖片';
COMMENT ON COLUMN public.image_library.name IS '圖片名稱';
COMMENT ON COLUMN public.image_library.description IS '圖片描述';
COMMENT ON COLUMN public.image_library.file_path IS '檔案在 Storage 的路徑';
COMMENT ON COLUMN public.image_library.public_url IS '圖片公開 URL';
COMMENT ON COLUMN public.image_library.category IS '分類：general, attraction, hotel, activity, cover 等';
COMMENT ON COLUMN public.image_library.tags IS '標籤陣列，用於搜尋';

COMMIT;