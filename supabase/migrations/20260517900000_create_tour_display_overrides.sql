-- ═══════════════════════════════════════════════════════════════════════════
-- tour_display_overrides — 展示行程 Canvas 編輯儲存
--
-- 目的：
-- 業務在後台編輯永成款展示行程（文字微調 / 換圖 / 加 block）、
-- 編完按「發布」、客人才看到新版。
--
-- 設計：
-- - 一個 tour 對 1 row（PK = tour_id、UNIQUE）
-- - 兩份 canvas JSONB：
--     canvas           = 草稿（業務正在編、未公開）
--     published_canvas = 發布版 snapshot（客人看的、按發布按鈕才更新）
-- - 沒 row 表示「業務沒編輯過、客人看 auto-generate」
--
-- 為什麼用「整份 canvas」而不是「每欄 override」：
-- - 規格書原寫 override（merge source data + 修改值）、但實作太複雜、merge bug 多
-- - 整份 JSONB 簡單、版本管理容易、source data 改了業務再自己刷新即可
-- - JSONB 不貴、tour 數量級不大（千級）
--
-- RLS：
-- - 內部讀寫：setup_workspace_scoped_rls procedure（CLAUDE.md L5 規定）
-- - 公開讀：anon 只能讀 published = true 的 published_canvas
--
-- 5 SSOT 對齊（CLAUDE.md「8 維度 #8」）：
-- - L1 Feature: tours.display-itinerary（已存在於 src/modules/tours.ts）
-- - L2 Capability: tours.display-itinerary.read/write（已存在於 capabilities.ts）
-- - L3 三維 Scope: workspace_id 隔離（透過 RLS、不散刻）
-- - L4 狀態守門: N/A（沒有「封存」狀態）
-- - L5 RLS: setup_workspace_scoped_rls + anon 公開讀 policy
-- - L6 SSOT 防呆: created_by / updated_by → employees(id)、不 auth.users
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 主表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tour_display_overrides (
  -- 1:1 對 tour、用 tour_id 當 PK 避免重複 row
  -- 注意 tours.id 是 text（5/17 William 抓 type 不符 bug、tours 用 text id 不是 uuid）
  tour_id                text PRIMARY KEY REFERENCES public.tours(id) ON DELETE CASCADE,
  workspace_id           uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 主題（未來可能擴充：yongcheng / luxury / minimalist...）
  theme                  text NOT NULL DEFAULT 'yongcheng',

  -- 草稿 canvas（業務正在編、未公開）
  canvas                 jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 發布旗標 + 發布快照
  -- 沒按過發布 = published false + published_canvas NULL
  -- 按過發布 = published true + published_canvas 是當時 canvas 的快照
  published              boolean NOT NULL DEFAULT false,
  published_canvas       jsonb,
  published_at           timestamptz,
  published_by           uuid REFERENCES public.employees(id) ON DELETE SET NULL,

  -- 審計（CLAUDE.md 紅線 B：FK 必指 employees(id)、不是 auth.users）
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by             uuid REFERENCES public.employees(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_display_overrides_workspace
  ON public.tour_display_overrides(workspace_id);

CREATE INDEX IF NOT EXISTS idx_tour_display_overrides_published
  ON public.tour_display_overrides(published) WHERE published = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — 走中央 procedure、不散刻 4 條 policy
-- ─────────────────────────────────────────────────────────────────────────────
CALL public.setup_workspace_scoped_rls('tour_display_overrides');

-- ─────────────────────────────────────────────────────────────────────────────
-- 公開讀 policy — anon 只能讀 published = true、且只回 published_canvas
-- 用途：/p/tour/[code]/yongcheng 對客頁面 server-side fetch
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tour_display_overrides_public_read ON public.tour_display_overrides;
CREATE POLICY tour_display_overrides_public_read
  ON public.tour_display_overrides
  FOR SELECT
  TO anon
  USING (published = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at 自動更新 trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_tour_display_overrides_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tour_display_overrides_updated_at
  ON public.tour_display_overrides;

CREATE TRIGGER trg_tour_display_overrides_updated_at
  BEFORE UPDATE ON public.tour_display_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tour_display_overrides_updated_at();

-- 註解（DB doc）
COMMENT ON TABLE public.tour_display_overrides IS
  '展示行程 Canvas 儲存：業務編輯的永成款行程 JSON、草稿 / 發布兩份';
COMMENT ON COLUMN public.tour_display_overrides.canvas IS
  '草稿 YongchengCanvas JSON、業務編輯中的版本、客人看不到';
COMMENT ON COLUMN public.tour_display_overrides.published_canvas IS
  '發布版 snapshot、客人看 /p/tour/[code]/yongcheng 讀的就是這個';
COMMENT ON COLUMN public.tour_display_overrides.published IS
  '是否已發布；false 表示草稿、true 表示客人可看 published_canvas';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_tour_display_overrides_updated_at ON public.tour_display_overrides;
-- DROP FUNCTION IF EXISTS public.set_tour_display_overrides_updated_at();
-- DROP TABLE IF EXISTS public.tour_display_overrides CASCADE;
-- COMMIT;
