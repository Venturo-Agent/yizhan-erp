-- =====================================================
-- 旅遊知識庫 RAG 基礎架構（無 UI 階段、純資料層）
-- =====================================================
--
-- 為什麼建這 3 個表：
--   AI 客服需要「知道地區特色 / 適合什麼客人 / 親子注意事項 / 季節」等
--   結構化知識才能做顧問式回答。RAG 標準三件套：
--     documents（人類管理單位、一筆 = 一個地區）
--     chunks   （AI 檢索單位、一個 document 切多個 chunk）
--     tags     （標籤字典、檢索與篩選）
--
-- 設計重點：
--   - country / region 是 text 不是 enum、未來加韓國 / 越南只是新 row
--   - chunk_type 標準化、明天可演示「同地區從不同角度被檢索」
--   - embedding vector(1536) 對應 OpenAI text-embedding-3-small、暫留 null
--   - metadata jsonb 自由欄位、客戶要加標籤不動 schema
--   - workspace 隔離、走標準 setup_workspace_scoped_rls procedure
--   - FK 全指 employees(id)（紅線 B）
--
-- 為什麼今晚做：
--   2026-05-20 William 要去客戶現場演示 RAG 概念。
--   先把資料能讀進 production、用 SQL 即可演示「框架已成、之後接
--   OpenAI embedding 就活了」。UI 等客戶確認方向再做。
-- =====================================================

BEGIN;

-- ════════════════════════════════════════
-- Phase 1：啟用 pgvector extension
-- ════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS vector;

-- ════════════════════════════════════════
-- Phase 2：knowledge_documents（地區 = 一筆文件）
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 文件分類
  country         text NOT NULL,             -- '日本' / '泰國'
  region          text NOT NULL,             -- '金澤' / '沖繩' ...
  region_en       text,                      -- 'Kanazawa' / 'Okinawa' ...

  -- 文件主體
  title           text NOT NULL,             -- '金澤（Kanazawa）— 北陸小京都'
  positioning    text,                       -- 地區定位標語（一句話總結）

  -- 來源追蹤（將來換新檔可比對版本）
  source_file     text,                      -- '旅遊知識庫_日本泰國_10地區.xlsx'
  source_version  text,                      -- 'v1.0' / commit hash 等

  -- 彈性 metadata（季節 / 客群 / 風格旗標）
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 審計欄位（紅線 B、FK 指 employees）
  created_by      uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  -- 同 workspace 同 country + region 唯一（重跑 loader 用 ON CONFLICT）
  CONSTRAINT knowledge_documents_workspace_region_unique
    UNIQUE (workspace_id, country, region)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_workspace
  ON public.knowledge_documents(workspace_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_country
  ON public.knowledge_documents(workspace_id, country) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.knowledge_documents IS
  'RAG 旅遊知識庫文件表、一筆 = 一個地區（金澤 / 沖繩 / ...）。
   人類管理單位、會被切成多個 chunk 給 AI 檢索。';

-- ════════════════════════════════════════
-- Phase 3：knowledge_chunks（切塊 = AI 檢索單位）
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,

  -- 切塊分類（結構化 chunking、按 schema 欄位切）
  -- 可能值：
  --   positioning       - 地區定位標語
  --   audience_fit      - 適合什麼風格的客人
  --   audience_unfit    - 不適合什麼客人
  --   core_experience   - 核心體驗項目
  --   family_kids       - 親子族群注意事項
  --   family_senior     - 銀髮族群注意事項
  --   instagram         - 網美/打卡族群亮點
  --   food              - 美食特色
  --   duration          - 建議天數
  --   pairing           - 建議搭配地區
  --   season            - 季節建議與避開時段
  --   culture           - 獨特文化背景
  chunk_type      text NOT NULL,

  -- 主體內容
  content         text NOT NULL,

  -- 標籤（客群 / 風格 / 天數 / 季節）
  -- 範例：{"audience": ["family_kids", "couples"], "style": ["leisurely", "food"], "duration": ["3d2n", "5d4n"], "season": ["spring", "autumn"]}
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 向量（OpenAI text-embedding-3-small = 1536 維）
  -- 暫留 null、之後接 OpenAI 才填、不擋今晚演示
  embedding       vector(1536),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- 同文件同 chunk_type 唯一（重跑 loader 用 ON CONFLICT）
  CONSTRAINT knowledge_chunks_document_type_unique
    UNIQUE (document_id, chunk_type)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_workspace
  ON public.knowledge_chunks(workspace_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document
  ON public.knowledge_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type
  ON public.knowledge_chunks(workspace_id, chunk_type);

-- PostgreSQL Full-Text Search（暫代 vector search、之後可雙軌跑 hybrid search）
-- 用 simple config 處理中文（pg_jieba 之後再加、目前 simple 對短語也能 match）
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_fts
  ON public.knowledge_chunks
  USING gin (to_tsvector('simple', content));

-- HNSW index for vector search（pgvector 0.5+ 支援、暫不用 IVFFlat）
-- 等 embedding 有資料才建、不然空 index 浪費。先註解、loader 跑完手動加。
-- CREATE INDEX idx_knowledge_chunks_embedding_hnsw
--   ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE public.knowledge_chunks IS
  'RAG 切塊表、AI 檢索單位。每個地區依 chunk_type 切多塊、
   embedding 暫留 null（之後接 OpenAI）、metadata jsonb 存標籤。';

-- ════════════════════════════════════════
-- Phase 4：knowledge_tags（標籤字典）
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.knowledge_tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  category        text NOT NULL,    -- 'audience' / 'style' / 'duration' / 'season'
  code            text NOT NULL,    -- 'family_kids' / 'leisurely' / '5d4n' / 'spring'
  label           text NOT NULL,    -- '親子' / '悠閒慢活' / '5天4夜' / '春季'
  sort_order      integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT knowledge_tags_workspace_code_unique
    UNIQUE (workspace_id, category, code)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_tags_workspace_category
  ON public.knowledge_tags(workspace_id, category);

COMMENT ON TABLE public.knowledge_tags IS
  'RAG 標籤字典。後台勾選 + 客戶 sidebar filter 用。
   不是業務必須、loader 不依賴此表、UI 階段補。';

-- ════════════════════════════════════════
-- Phase 5：RLS（走標準 procedure、不散刻 policy）
-- ════════════════════════════════════════
CALL setup_workspace_scoped_rls('knowledge_documents');
CALL setup_workspace_scoped_rls('knowledge_chunks');
CALL setup_workspace_scoped_rls('knowledge_tags');

-- ════════════════════════════════════════
-- Phase 6：updated_at trigger
-- ════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_knowledge_documents_updated_at ON public.knowledge_documents;
CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_chunks_updated_at ON public.knowledge_chunks;
CREATE TRIGGER trg_knowledge_chunks_updated_at
  BEFORE UPDATE ON public.knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ════ Rollback（萬一炸了複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_knowledge_chunks_updated_at ON public.knowledge_chunks;
-- DROP TRIGGER IF EXISTS trg_knowledge_documents_updated_at ON public.knowledge_documents;
-- DROP TABLE IF EXISTS public.knowledge_tags;
-- DROP TABLE IF EXISTS public.knowledge_chunks;
-- DROP TABLE IF EXISTS public.knowledge_documents;
-- -- pgvector extension 不卸載（其他用途未來可能用）
-- COMMIT;
