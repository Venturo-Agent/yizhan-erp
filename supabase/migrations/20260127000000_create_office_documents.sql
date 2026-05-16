-- ============================================
-- Office 文件管理 - Univer 試算表/文件
-- ============================================
-- 支援 Spreadsheet (Excel) 和 Document (Word)
-- ============================================

BEGIN;

-- ============================================
-- 1. Office 文件主表 (office_documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.office_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 文件資訊
  name TEXT NOT NULL DEFAULT '未命名文件',
  type TEXT NOT NULL CHECK (type IN ('spreadsheet', 'document', 'slides')),

  -- Univer JSON 資料 (workbook/document snapshot)
  data JSONB NOT NULL DEFAULT '{}',

  -- 中繼資料
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_office_documents_workspace_id ON public.office_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_office_documents_type ON public.office_documents(type);
CREATE INDEX IF NOT EXISTS idx_office_documents_updated_at ON public.office_documents(updated_at DESC);

COMMENT ON TABLE public.office_documents IS 'Office 文件主表（Univer 試算表/文件）';
COMMENT ON COLUMN public.office_documents.type IS '文件類型: spreadsheet, document, slides';
COMMENT ON COLUMN public.office_documents.data IS 'Univer workbook/document JSON snapshot';

-- ============================================
-- 2. 自動更新 updated_at
-- ============================================
DROP TRIGGER IF EXISTS trigger_office_documents_updated_at ON public.office_documents;
CREATE TRIGGER trigger_office_documents_updated_at
BEFORE UPDATE ON public.office_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE public.office_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: 同 workspace 或 super admin
DROP POLICY IF EXISTS "office_documents_select" ON public.office_documents;
CREATE POLICY "office_documents_select" ON public.office_documents FOR SELECT
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

-- INSERT: 同 workspace
DROP POLICY IF EXISTS "office_documents_insert" ON public.office_documents;
CREATE POLICY "office_documents_insert" ON public.office_documents FOR INSERT
WITH CHECK (workspace_id = public.get_current_user_workspace());

-- UPDATE: 同 workspace 或 super admin
DROP POLICY IF EXISTS "office_documents_update" ON public.office_documents;
CREATE POLICY "office_documents_update" ON public.office_documents FOR UPDATE
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

-- DELETE: 同 workspace 或 super admin
DROP POLICY IF EXISTS "office_documents_delete" ON public.office_documents;
CREATE POLICY "office_documents_delete" ON public.office_documents FOR DELETE
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

COMMIT;
