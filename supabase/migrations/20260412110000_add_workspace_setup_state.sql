-- ============================================
-- Migration: workspaces 加 setup_state（新手引導狀態）
-- Date: 2026-04-12
-- ============================================

BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS setup_state JSONB DEFAULT '{
    "password_changed": false,
    "company_info_done": false,
    "has_employees": false,
    "tutorial_dismissed": false
  }'::jsonb;

COMMENT ON COLUMN public.workspaces.setup_state IS '新手引導進度';

-- 既有 workspace：假設都已設定完成，避免跳教學
UPDATE public.workspaces
SET setup_state = '{
  "password_changed": true,
  "company_info_done": true,
  "has_employees": true,
  "tutorial_dismissed": true
}'::jsonb
WHERE setup_state IS NULL OR (setup_state->>'tutorial_dismissed')::boolean IS DISTINCT FROM TRUE;

COMMIT;
