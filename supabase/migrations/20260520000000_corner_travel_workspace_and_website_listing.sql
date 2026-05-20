-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Corner Travel workspace + tours 加官網上架欄位
-- 2026-05-20  William 拍板（corner-website ERP 整合 spec v1）
--
-- 背景：
--   Corner Travel（角落旅行社）官網（corner.venturo.tw、Astro SSG）要跟
--   yizhan-erp 整合走「ERP 是 SSOT、官網是櫥窗」模式。業務在 ERP 開團、
--   按「儲存並上架」→ Astro rebuild → 官網更新；客人在官網報名 → ERP 自動
--   建 orders/customers。
--
-- 本 migration 三塊：
--   A. 確保 Corner Travel workspace 存在（idempotent、避免再跑撞 unique）
--   B. tours 加 9 個官網上架欄位（is_public_listed + 行銷文案 + SEO + 上架時間/人）
--   C. 加 partial index 加速「上架中的團」查詢（給 Astro build 時用）
--
-- 紅線對齊：
--   - 紅線 B：published_by 是審計欄位、FK 指 employees(id) ON DELETE SET NULL
--   - 紅線 E：本 migration 純加欄位 + idempotent INSERT、無 trigger / 無 API
--     雙寫風險
--   - 純加欄位、不破壞既有資料、不需 reverse SQL（仍附 rollback 註解）
--
-- 注意：
--   - 9 個新欄位都 nullable（除 is_public_listed default false）、不影響既有 tours
--   - workspace_features / role_capabilities 等 SSOT 由後續 migration 處理
--     （本 migration 只動 schema、不動權限）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────── Block A: Corner Travel workspace（idempotent）─────────
-- 既有 workspaces.code UNIQUE constraint、ON CONFLICT (code) DO NOTHING
-- 若 'CORNER' 已存在則跳過（不覆寫既有 name 等欄位）
INSERT INTO public.workspaces (code, name, is_active, subscription_plan)
VALUES (
  'CORNER',
  '角落旅行社股份有限公司',
  true,
  'custom'
)
ON CONFLICT (code) DO NOTHING;


-- ───────── Block B: tours 加 9 個官網上架欄位 ─────────
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS is_public_listed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_title text,
  ADD COLUMN IF NOT EXISTS marketing_subtitle text,
  ADD COLUMN IF NOT EXISTS marketing_body text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;


-- ───────── Block C: partial index 加速「上架中的團」查詢 ─────────
-- 給 Astro build 時 GET /api/public/tours 用：
--   WHERE workspace_id = $1 AND is_public_listed = true AND deleted_at IS NULL
-- partial index 只 index 上架中 + 未刪除的 row、體積小、查詢快
CREATE INDEX IF NOT EXISTS idx_tours_public_listed
  ON public.tours (workspace_id, is_public_listed)
  WHERE is_public_listed = true AND deleted_at IS NULL;


-- ───────── Block D: COMMENT ON COLUMN（業務語意註解）─────────
COMMENT ON COLUMN public.tours.is_public_listed IS '是否上架到 Corner 官網（櫥窗）。業務在 /marketing/website 切換、true 才會出現在 corner.venturo.tw /tours 列表';
COMMENT ON COLUMN public.tours.marketing_title IS '對外行銷標題（不用內部團名、給官網顯示用）';
COMMENT ON COLUMN public.tours.marketing_subtitle IS '對外副標一句話（官網 card / 詳情頁 hero 區用）';
COMMENT ON COLUMN public.tours.marketing_body IS '行程介紹長文（markdown、官網詳情頁主內容）';
COMMENT ON COLUMN public.tours.hero_image_url IS '主視覺大圖 URL（Supabase Storage public URL）';
COMMENT ON COLUMN public.tours.seo_title IS 'SEO 標題（Google 搜尋結果顯示）';
COMMENT ON COLUMN public.tours.seo_description IS 'SEO 描述（Google 搜尋結果 snippet）';
COMMENT ON COLUMN public.tours.published_at IS '最後一次按「儲存並上架」的時間';
COMMENT ON COLUMN public.tours.published_by IS '最後一次上架的員工 id（FK employees.id、ON DELETE SET NULL）';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_tours_public_listed;
-- ALTER TABLE public.tours
--   DROP COLUMN IF EXISTS published_by,
--   DROP COLUMN IF EXISTS published_at,
--   DROP COLUMN IF EXISTS seo_description,
--   DROP COLUMN IF EXISTS seo_title,
--   DROP COLUMN IF EXISTS hero_image_url,
--   DROP COLUMN IF EXISTS marketing_body,
--   DROP COLUMN IF EXISTS marketing_subtitle,
--   DROP COLUMN IF EXISTS marketing_title,
--   DROP COLUMN IF EXISTS is_public_listed;
-- -- 注意：workspace row 不刪（可能已有資料引用、人工確認後再 DELETE）
-- COMMIT;
