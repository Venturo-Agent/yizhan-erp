-- ════════════════════════════════════════════════════════════════════════════
-- Migration: tours 加 branch_id FK + backfill
-- 2026-05-18
--
-- 背景：
--   William 要求旅遊團資料依分公司隔離（各分公司看不到彼此的旅遊團）。
--   tours 目前只有 workspace_id、沒有 branch_id，各分公司資料混在一起。
--
-- 本 migration：
--   1. 加 branch_id uuid REFERENCES branches(id)，先 nullable
--   2. Backfill：從 employees.branch_id 填回（用 tours.created_by → employees.id）
--   3. Index on (workspace_id, branch_id) 供過濾查詢
--
-- 注意：不設 NOT NULL — 歷史資料 created_by 可能為空，或員工沒有 branch_id
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Backfill：从建立者員工的 branch_id 回填
UPDATE public.tours t
SET branch_id = e.branch_id
FROM public.employees e
WHERE t.created_by = e.id
  AND e.branch_id IS NOT NULL
  AND t.branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tours_workspace_branch
  ON public.tours(workspace_id, branch_id);
