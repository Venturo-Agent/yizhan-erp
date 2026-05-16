-- 旅遊團文件資源管理表
-- 用於存儲廠商報價單、預約確認單等文件

BEGIN;

-- 建立 tour_documents 表
CREATE TABLE IF NOT EXISTS public.tour_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),

  -- 文件資訊
  name text NOT NULL,                    -- 文件名稱（如：廠商報價單、飯店確認信）
  description text,                      -- 文件說明（可選）

  -- 檔案資訊
  file_path text NOT NULL,               -- Storage 路徑
  public_url text NOT NULL,              -- 公開 URL
  file_name text NOT NULL,               -- 原始檔名
  file_size integer,                     -- 檔案大小（bytes）
  mime_type text,                        -- MIME 類型

  -- 審計欄位
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_documents_tour_id ON public.tour_documents(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_documents_workspace_id ON public.tour_documents(workspace_id);

-- 註解
COMMENT ON TABLE public.tour_documents IS '旅遊團文件資源管理';
COMMENT ON COLUMN public.tour_documents.name IS '文件名稱（使用者自訂）';
COMMENT ON COLUMN public.tour_documents.description IS '文件說明';
COMMENT ON COLUMN public.tour_documents.file_path IS 'Supabase Storage 檔案路徑';
COMMENT ON COLUMN public.tour_documents.public_url IS '檔案公開 URL';
COMMENT ON COLUMN public.tour_documents.file_name IS '原始檔案名稱';

-- 啟用 RLS
ALTER TABLE public.tour_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "tour_documents_select" ON public.tour_documents;
CREATE POLICY "tour_documents_select" ON public.tour_documents FOR SELECT
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "tour_documents_insert" ON public.tour_documents;
CREATE POLICY "tour_documents_insert" ON public.tour_documents FOR INSERT
  WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "tour_documents_update" ON public.tour_documents;
CREATE POLICY "tour_documents_update" ON public.tour_documents FOR UPDATE
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "tour_documents_delete" ON public.tour_documents;
CREATE POLICY "tour_documents_delete" ON public.tour_documents FOR DELETE
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 自動更新 updated_at
CREATE OR REPLACE TRIGGER set_tour_documents_updated_at
  BEFORE UPDATE ON public.tour_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
