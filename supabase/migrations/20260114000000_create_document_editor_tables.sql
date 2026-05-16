-- ============================================
-- 文件編輯器架構 - 手冊 & 行程表版本管理
-- ============================================
-- 核心理念：載入→編輯→儲存版本（非即時同步）
-- ============================================

BEGIN;

-- ============================================
-- 1. 手冊文件表 (brochure_documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.brochure_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT REFERENCES public.tours(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 文件資訊
  name TEXT NOT NULL DEFAULT '未命名手冊',
  type TEXT NOT NULL DEFAULT 'full', -- 'front', 'back', 'full'

  -- 版本指標
  current_version_id UUID, -- 稍後添加外鍵

  -- 中繼資料
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_brochure_documents_tour_id ON public.brochure_documents(tour_id);
CREATE INDEX IF NOT EXISTS idx_brochure_documents_workspace_id ON public.brochure_documents(workspace_id);

COMMENT ON TABLE public.brochure_documents IS '手冊文件主表';
COMMENT ON COLUMN public.brochure_documents.type IS '手冊類型: front=封面, back=封底, full=完整';
COMMENT ON COLUMN public.brochure_documents.current_version_id IS '目前使用的版本 ID';

-- ============================================
-- 2. 手冊版本表 (brochure_versions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.brochure_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.brochure_documents(id) ON DELETE CASCADE,

  -- 版本資訊
  version_number INTEGER NOT NULL DEFAULT 1,

  -- 內容 (Fabric.js canvas JSON)
  data JSONB NOT NULL DEFAULT '{}',

  -- 縮圖 (用於版本預覽)
  thumbnail_url TEXT,

  -- 恢復來源 (如果是從舊版本恢復的)
  restored_from UUID REFERENCES public.brochure_versions(id),

  -- 中繼資料
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,

  -- 確保同一文件的版本號不重複
  UNIQUE(document_id, version_number)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_brochure_versions_document_id ON public.brochure_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_brochure_versions_created_at ON public.brochure_versions(created_at DESC);

COMMENT ON TABLE public.brochure_versions IS '手冊版本歷史表';
COMMENT ON COLUMN public.brochure_versions.data IS 'Fabric.js canvas JSON 資料';
COMMENT ON COLUMN public.brochure_versions.restored_from IS '如果是從舊版本恢復，記錄來源版本 ID';

-- 添加外鍵 (brochure_documents.current_version_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_brochure_current_version') THEN
    ALTER TABLE public.brochure_documents
    ADD CONSTRAINT fk_brochure_current_version
    FOREIGN KEY (current_version_id) REFERENCES public.brochure_versions(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 3. 行程表文件表 (itinerary_documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT REFERENCES public.tours(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 文件資訊
  name TEXT NOT NULL DEFAULT '未命名行程表',

  -- 版本指標
  current_version_id UUID, -- 稍後添加外鍵

  -- 中繼資料
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_itinerary_documents_tour_id ON public.itinerary_documents(tour_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_documents_workspace_id ON public.itinerary_documents(workspace_id);

COMMENT ON TABLE public.itinerary_documents IS '行程表文件主表';

-- ============================================
-- 4. 行程表版本表 (itinerary_versions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.itinerary_documents(id) ON DELETE CASCADE,

  -- 版本資訊
  version_number INTEGER NOT NULL DEFAULT 1,

  -- 內容 (行程表 JSON)
  data JSONB NOT NULL DEFAULT '{}',

  -- 縮圖
  thumbnail_url TEXT,

  -- 恢復來源
  restored_from UUID REFERENCES public.itinerary_versions(id),

  -- 中繼資料
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,

  UNIQUE(document_id, version_number)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_itinerary_versions_document_id ON public.itinerary_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_versions_created_at ON public.itinerary_versions(created_at DESC);

COMMENT ON TABLE public.itinerary_versions IS '行程表版本歷史表';

-- 添加外鍵 (itinerary_documents.current_version_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_itinerary_current_version') THEN
    ALTER TABLE public.itinerary_documents
    ADD CONSTRAINT fk_itinerary_current_version
    FOREIGN KEY (current_version_id) REFERENCES public.itinerary_versions(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 5. 模板表 (design_templates)
-- ============================================
CREATE TABLE IF NOT EXISTS public.design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id), -- NULL = 公開模板

  -- 模板資訊
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'brochure', 'itinerary'
  category TEXT, -- 'travel', 'business', 'minimal', etc.
  tags TEXT[] DEFAULT '{}',

  -- 內容
  data JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,

  -- 狀態
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- 統計
  use_count INTEGER DEFAULT 0,

  -- 中繼資料
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_design_templates_type ON public.design_templates(type);
CREATE INDEX IF NOT EXISTS idx_design_templates_workspace_id ON public.design_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_design_templates_is_public ON public.design_templates(is_public) WHERE is_public = true;

COMMENT ON TABLE public.design_templates IS '設計模板表（手冊/行程表共用）';
COMMENT ON COLUMN public.design_templates.workspace_id IS 'NULL 表示公開模板，否則為私人模板';

-- ============================================
-- 6. 自動遞增版本號的 Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_increment_version_number()
RETURNS TRIGGER AS $$
BEGIN
  -- 取得該文件的最大版本號 + 1
  NEW.version_number := COALESCE(
    (SELECT MAX(version_number) + 1
     FROM (
       SELECT version_number FROM public.brochure_versions WHERE document_id = NEW.document_id
       UNION ALL
       SELECT version_number FROM public.itinerary_versions WHERE document_id = NEW.document_id
     ) AS all_versions),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為手冊版本表創建 trigger
DROP TRIGGER IF EXISTS trigger_brochure_version_number ON public.brochure_versions;
DROP TRIGGER IF EXISTS trigger_brochure_version_number ON public.brochure_versions;
CREATE TRIGGER trigger_brochure_version_number
BEFORE INSERT ON public.brochure_versions
FOR EACH ROW
EXECUTE FUNCTION public.auto_increment_version_number();

-- 為行程表版本表創建 trigger
DROP TRIGGER IF EXISTS trigger_itinerary_version_number ON public.itinerary_versions;
DROP TRIGGER IF EXISTS trigger_itinerary_version_number ON public.itinerary_versions;
CREATE TRIGGER trigger_itinerary_version_number
BEFORE INSERT ON public.itinerary_versions
FOR EACH ROW
EXECUTE FUNCTION public.auto_increment_version_number();

-- ============================================
-- 7. 自動更新 updated_at 的 Trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為文件表創建 trigger
DROP TRIGGER IF EXISTS trigger_brochure_documents_updated_at ON public.brochure_documents;
DROP TRIGGER IF EXISTS trigger_brochure_documents_updated_at ON public.brochure_documents;
CREATE TRIGGER trigger_brochure_documents_updated_at
BEFORE UPDATE ON public.brochure_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_itinerary_documents_updated_at ON public.itinerary_documents;
DROP TRIGGER IF EXISTS trigger_itinerary_documents_updated_at ON public.itinerary_documents;
CREATE TRIGGER trigger_itinerary_documents_updated_at
BEFORE UPDATE ON public.itinerary_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_design_templates_updated_at ON public.design_templates;
DROP TRIGGER IF EXISTS trigger_design_templates_updated_at ON public.design_templates;
CREATE TRIGGER trigger_design_templates_updated_at
BEFORE UPDATE ON public.design_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. RLS Policies
-- ============================================

-- 啟用 RLS
ALTER TABLE public.brochure_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brochure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

-- brochure_documents policies
DROP POLICY IF EXISTS "brochure_documents_select" ON public.brochure_documents;
CREATE POLICY "brochure_documents_select" ON public.brochure_documents FOR SELECT
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

DROP POLICY IF EXISTS "brochure_documents_insert" ON public.brochure_documents;
CREATE POLICY "brochure_documents_insert" ON public.brochure_documents FOR INSERT
WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "brochure_documents_update" ON public.brochure_documents;
CREATE POLICY "brochure_documents_update" ON public.brochure_documents FOR UPDATE
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

DROP POLICY IF EXISTS "brochure_documents_delete" ON public.brochure_documents;
CREATE POLICY "brochure_documents_delete" ON public.brochure_documents FOR DELETE
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

-- brochure_versions policies (透過 document_id 繼承權限)
DROP POLICY IF EXISTS "brochure_versions_select" ON public.brochure_versions;
CREATE POLICY "brochure_versions_select" ON public.brochure_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brochure_documents d
    WHERE d.id = document_id
    AND (d.workspace_id = public.get_current_user_workspace() OR public.is_super_admin())
  )
);

DROP POLICY IF EXISTS "brochure_versions_insert" ON public.brochure_versions;
CREATE POLICY "brochure_versions_insert" ON public.brochure_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brochure_documents d
    WHERE d.id = document_id
    AND d.workspace_id = public.get_current_user_workspace()
  )
);

DROP POLICY IF EXISTS "brochure_versions_delete" ON public.brochure_versions;
CREATE POLICY "brochure_versions_delete" ON public.brochure_versions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.brochure_documents d
    WHERE d.id = document_id
    AND (d.workspace_id = public.get_current_user_workspace() OR public.is_super_admin())
  )
);

-- itinerary_documents policies
DROP POLICY IF EXISTS "itinerary_documents_select" ON public.itinerary_documents;
CREATE POLICY "itinerary_documents_select" ON public.itinerary_documents FOR SELECT
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

DROP POLICY IF EXISTS "itinerary_documents_insert" ON public.itinerary_documents;
CREATE POLICY "itinerary_documents_insert" ON public.itinerary_documents FOR INSERT
WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "itinerary_documents_update" ON public.itinerary_documents;
CREATE POLICY "itinerary_documents_update" ON public.itinerary_documents FOR UPDATE
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

DROP POLICY IF EXISTS "itinerary_documents_delete" ON public.itinerary_documents;
CREATE POLICY "itinerary_documents_delete" ON public.itinerary_documents FOR DELETE
USING (workspace_id = public.get_current_user_workspace() OR public.is_super_admin());

-- itinerary_versions policies
DROP POLICY IF EXISTS "itinerary_versions_select" ON public.itinerary_versions;
CREATE POLICY "itinerary_versions_select" ON public.itinerary_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.itinerary_documents d
    WHERE d.id = document_id
    AND (d.workspace_id = public.get_current_user_workspace() OR public.is_super_admin())
  )
);

DROP POLICY IF EXISTS "itinerary_versions_insert" ON public.itinerary_versions;
CREATE POLICY "itinerary_versions_insert" ON public.itinerary_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.itinerary_documents d
    WHERE d.id = document_id
    AND d.workspace_id = public.get_current_user_workspace()
  )
);

DROP POLICY IF EXISTS "itinerary_versions_delete" ON public.itinerary_versions;
CREATE POLICY "itinerary_versions_delete" ON public.itinerary_versions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.itinerary_documents d
    WHERE d.id = document_id
    AND (d.workspace_id = public.get_current_user_workspace() OR public.is_super_admin())
  )
);

-- design_templates policies (公開模板所有人可看，私人模板只有 workspace 內可看)
DROP POLICY IF EXISTS "design_templates_select" ON public.design_templates;
CREATE POLICY "design_templates_select" ON public.design_templates FOR SELECT
USING (
  is_public = true
  OR workspace_id = public.get_current_user_workspace()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "design_templates_insert" ON public.design_templates;
CREATE POLICY "design_templates_insert" ON public.design_templates FOR INSERT
WITH CHECK (
  workspace_id IS NULL -- 公開模板（需要特殊權限，這裡暫時允許）
  OR workspace_id = public.get_current_user_workspace()
);

DROP POLICY IF EXISTS "design_templates_update" ON public.design_templates;
CREATE POLICY "design_templates_update" ON public.design_templates FOR UPDATE
USING (
  workspace_id = public.get_current_user_workspace()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "design_templates_delete" ON public.design_templates;
CREATE POLICY "design_templates_delete" ON public.design_templates FOR DELETE
USING (
  workspace_id = public.get_current_user_workspace()
  OR public.is_super_admin()
);

COMMIT;
