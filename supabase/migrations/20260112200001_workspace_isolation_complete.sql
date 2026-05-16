-- =====================================================
-- Venturo ERP - Workspace 資料隔離完整修復 (簡化版)
-- 檔案：20260112200000_workspace_isolation_complete.sql
-- 日期：2026-01-12
--
-- 目標：為 proposal_packages 添加 workspace_id
-- =====================================================

BEGIN;

-- ============================================
-- 1. proposal_packages 添加 workspace_id
-- ============================================

-- 添加欄位
ALTER TABLE public.proposal_packages
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- 從 proposals 表填充現有記錄的 workspace_id
UPDATE public.proposal_packages pp
SET workspace_id = p.workspace_id
FROM public.proposals p
WHERE pp.proposal_id = p.id
  AND pp.workspace_id IS NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_proposal_packages_workspace
ON public.proposal_packages(workspace_id);

COMMENT ON COLUMN public.proposal_packages.workspace_id IS '工作空間 ID（用於資料隔離）';

COMMIT;
