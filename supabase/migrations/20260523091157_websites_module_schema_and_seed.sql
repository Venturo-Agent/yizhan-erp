-- ════════════════════════════════════════════════════════════════════════════
-- Migration: websites module schema + seed
-- 2026-05-23  William 拍板（spec：2026-05-23-websites-module-spec.md）
--
-- 背景：
--   新模組「客戶官網系統」(addon)、客戶加購後可進 design 編輯器自由排版、
--   從 9 套 component 變體庫拼出官網、發布到 {subdomain}.venturo.tw（Next.js ISR）。
--   既有 marketing module 留作 Corner 專用 (Astro)、新 websites module 走通用 Next.js。
--
-- 本 migration 三塊：
--   A. workspaces 加 6 欄（subdomain + canvas + 4 個審計欄位）
--   B. subdomain partial index（multi-tenant routing 用）
--   C. workspace_features seed website_builder (預設 false、簽 addon 後手動開)
--
-- 紅線對齊：
--   - 紅線 A：workspaces RLS 不動 FORCE、純加欄位
--   - 紅線 B：審計欄位 FK 指 employees(id) ON DELETE SET NULL
--   - 紅線 E：本 migration 純加欄位 + idempotent INSERT、無 trigger 雙寫
--   - 紅線 H：workspaces 既有 RLS 已守 workspace_id、新欄位繼承
--
-- 注意：
--   - 6 個新欄位都 nullable、不影響既有 workspaces
--   - role_capabilities seed 不在本 migration 處理（由 onboarding flow / 手動配置）
--   - 第二份 migration 處理 capability seed（如需要）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────── Block A: workspaces 加 6 個欄位 ─────────
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS subdomain text UNIQUE,
  ADD COLUMN IF NOT EXISTS canvas jsonb,
  ADD COLUMN IF NOT EXISTS canvas_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS canvas_updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canvas_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS canvas_published_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;


-- ───────── Block B: subdomain partial index（multi-tenant routing 加速）─────────
CREATE INDEX IF NOT EXISTS idx_workspaces_subdomain
  ON public.workspaces (subdomain)
  WHERE subdomain IS NOT NULL;


-- ───────── Block C: workspace_features seed website_builder ─────────
-- 對所有現存 workspace 預設 enabled=false、銷售流程簽 addon 後手動開
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'website_builder', false
FROM public.workspaces
ON CONFLICT (workspace_id, feature_code) DO NOTHING;


-- ───────── Block D: COMMENT ON COLUMN（業務語意註解）─────────
COMMENT ON COLUMN public.workspaces.subdomain IS '客戶官網子網域、{subdomain}.venturo.tw 解到此 workspace。UNIQUE、簽約時手動設定';
COMMENT ON COLUMN public.workspaces.canvas IS '官網 Canvas 結構（sections + blocks）、由 design 編輯器寫。JSON schema 見 src/lib/canvas/types.ts';
COMMENT ON COLUMN public.workspaces.canvas_updated_at IS 'canvas 最後一次編輯時間（auto-save 觸發）';
COMMENT ON COLUMN public.workspaces.canvas_updated_by IS '最後編輯人（FK employees.id、ON DELETE SET NULL）';
COMMENT ON COLUMN public.workspaces.canvas_published_at IS 'canvas 最後一次按「發布」的時間（觸發 on-demand revalidate）';
COMMENT ON COLUMN public.workspaces.canvas_published_by IS '最後發布人（FK employees.id、ON DELETE SET NULL）';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DELETE FROM public.workspace_features WHERE feature_code = 'website_builder';
-- DROP INDEX IF EXISTS public.idx_workspaces_subdomain;
-- ALTER TABLE public.workspaces
--   DROP COLUMN IF EXISTS canvas_published_by,
--   DROP COLUMN IF EXISTS canvas_published_at,
--   DROP COLUMN IF EXISTS canvas_updated_by,
--   DROP COLUMN IF EXISTS canvas_updated_at,
--   DROP COLUMN IF EXISTS canvas,
--   DROP COLUMN IF EXISTS subdomain;
-- COMMIT;
