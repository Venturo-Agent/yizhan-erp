-- ═══════════════════════════════════════════════
-- 文件系統模組 Phase 1
-- 建立 workspace_documents + workspace_seals 表
-- ═══════════════════════════════════════════════

BEGIN;

-- 章印管理
CREATE TABLE IF NOT EXISTS public.workspace_seals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  image_url    text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CALL public.setup_workspace_scoped_rls('workspace_seals');

-- 文件儲存
CREATE TABLE IF NOT EXISTS public.workspace_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  file_type    text NOT NULL CHECK (file_type IN ('pdf','docx','xlsx','pptx','other')),
  storage_path text NOT NULL,
  size_bytes   bigint,
  created_by   uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CALL public.setup_workspace_scoped_rls('workspace_documents');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_documents_workspace_id
  ON public.workspace_documents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_documents_created_at
  ON public.workspace_documents(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_seals_workspace_id
  ON public.workspace_seals(workspace_id) WHERE is_active = true;

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '文件系統 Phase 1 建立完成';
  RAISE NOTICE '  - workspace_seals (RLS: setup_workspace_scoped_rls)';
  RAISE NOTICE '  - workspace_documents (RLS: setup_workspace_scoped_rls, soft-delete)';
  RAISE NOTICE '  - 3 indexes (workspace_id + created_at + seals active)';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS public.workspace_documents;
-- DROP TABLE IF EXISTS public.workspace_seals;
