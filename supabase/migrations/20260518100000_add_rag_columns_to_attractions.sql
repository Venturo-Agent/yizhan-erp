-- ─────────────────────────────────────────────────────────────────────────────
-- 景點圈管理（漫途品管站）— 補 RAG 池欄位
--
-- 2026-05-17 William 拍板：
--   旅遊資料庫 = 倉庫（含助理抓進來的、未驗證的）
--   景點圈管理 = 品管站（漫途員工逐筆蓋章決定哪些 AI 能用）
--   AI 排程 = 只讀蓋過章的景點（WHERE rag_enabled = true）
--
-- 防止 AI 亂講錯誤景點給客戶。
--
-- 欄位設計：
--   rag_enabled   — 是否入池（蓋章 = true、退章 = false）
--   rag_quality   — 完整度分數 0-100（Server Action 計算、幫品管員快速判斷）
--   rag_warnings  — 缺哪些欄位的提醒文字陣列
--   reviewed_by   — 誰蓋的章（FK employees、紅線 B 對齊）
--   reviewed_at   — 何時蓋的章
--
-- 寫權：透過既有 RLS policy（capability 'shared_data.attractions.write'、
--      5/11 shared_data_schema.sql 已設、漫途 admin role 已 seed）
--
-- 對應檔：
--   - 新路由 /shared-data/attractions（路由殼已建、第二刀做品管 UI）
--   - sidebar entry / 首頁卡片 / i18n label 同 commit 內補
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══ 1. 加 5 個欄位 ═══
ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS rag_enabled  BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rag_quality  SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rag_warnings TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reviewed_by  UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;

-- ═══ 2. FK：reviewed_by → employees(id)（紅線 B）═══
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attractions_reviewed_by_fkey'
  ) THEN
    ALTER TABLE public.attractions
      ADD CONSTRAINT attractions_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ═══ 3. CHECK：rag_quality 必須 0-100 ═══
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attractions_rag_quality_range'
  ) THEN
    ALTER TABLE public.attractions
      ADD CONSTRAINT attractions_rag_quality_range
      CHECK (rag_quality >= 0 AND rag_quality <= 100);
  END IF;
END $$;

-- ═══ 4. Index ═══
-- 已入池查詢（AI 排程用、partial index、只 index true 的、省空間）
CREATE INDEX IF NOT EXISTS idx_attractions_rag_enabled
  ON public.attractions(rag_enabled)
  WHERE rag_enabled = true;

-- 待審清單查詢（品管站預設視角、按完整度排序方便挑高分先審）
CREATE INDEX IF NOT EXISTS idx_attractions_rag_review_pending
  ON public.attractions(rag_quality DESC)
  WHERE rag_enabled = false;

-- ═══ 5. 資料字典 ═══
COMMENT ON COLUMN public.attractions.rag_enabled IS
  '是否入 RAG 池（漫途員工蓋章後 true、AI 排程只用 true 的）';
COMMENT ON COLUMN public.attractions.rag_quality IS
  '完整度分數 0-100（Server Action 計算、欄位齊全度、幫品管員快速判斷）';
COMMENT ON COLUMN public.attractions.rag_warnings IS
  '完整度警示（缺哪些欄位、譬如 [缺中文描述, 缺封面圖]、給品管員提醒用）';
COMMENT ON COLUMN public.attractions.reviewed_by IS
  '蓋章 / 退章的漫途員工 ID（FK employees）';
COMMENT ON COLUMN public.attractions.reviewed_at IS
  '蓋章 / 退章時間';

-- PostgREST schema cache reload（加 column 必跑、否則 client 查新欄位炸）
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_attractions_rag_review_pending;
-- DROP INDEX IF EXISTS public.idx_attractions_rag_enabled;
-- ALTER TABLE public.attractions DROP CONSTRAINT IF EXISTS attractions_rag_quality_range;
-- ALTER TABLE public.attractions DROP CONSTRAINT IF EXISTS attractions_reviewed_by_fkey;
-- ALTER TABLE public.attractions
--   DROP COLUMN IF EXISTS reviewed_at,
--   DROP COLUMN IF EXISTS reviewed_by,
--   DROP COLUMN IF EXISTS rag_warnings,
--   DROP COLUMN IF EXISTS rag_quality,
--   DROP COLUMN IF EXISTS rag_enabled;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
