-- ════════════════════════════════════════════════════════════════════
-- rag_topic_queue — 大型復盤產出的「RAG 待補主題清單」
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼：
--   AI 跟客人聊天會遇到「答不出來」的問題（沒接 RAG）。每個對話的速記卡
--   會收 unanswered_questions、但散在各對話。
--
--   大型復盤把全 workspace 的 unanswered_questions 餵 LLM 聚合、產一張
--   「該補進 RAG 的主題清單」、業務看了知道「客人在問什麼我們答不出來」、
--   優先補哪些知識。
--
-- 流程：
--   1. AI Hub 對話復盤 tab、業務按「跑復盤」
--   2. retrospective-aggregator 拉 workspace 全 customer_memories.unanswered_questions
--   3. 餵 LLM：「合併同類問題、產主題清單、附範例對話 link」
--   4. 結果寫進這張表、status='pending'
--   5. 業務 review → 標 'added_to_rag'（已補）或 'declined'（不採納、無聊問題）
--
-- 6 層 SOP：
--   L1 Feature Gate → ai_hub
--   L2 Capability   → ai_hub.read（看清單）/ ai_hub.write（標狀態）
--   L3 三維 Scope   → N/A（workspace 內全員可見）
--   L4 狀態守門     → status check constraint
--   L5 RLS          → setup_workspace_scoped_rls
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)

BEGIN;

CREATE TABLE public.rag_topic_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 主題摘要（LLM 寫的、人話）
  topic_summary text NOT NULL,

  -- 出現過幾個對話（聚合計數）
  occurrence_count integer NOT NULL DEFAULT 1,

  -- 出現過的對話 id 陣列（最多存 10 筆範例、給業務點過去看脈絡）
  example_conversation_ids uuid[] NOT NULL DEFAULT '{}',

  -- 原始問題陣列（從各對話 unanswered_questions 抽出來、最多 10 筆）
  example_questions text[] NOT NULL DEFAULT '{}',

  -- 狀態：pending（待 review）/ added_to_rag（已補進 RAG）/ declined（不採納）
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'added_to_rag', 'declined')),

  -- 業務手動寫的補充說明（如「已寫進 KB-X」/「客戶亂問、不重要」）
  notes text,

  -- 同一次復盤 run 用同 uuid、方便分組顯示「2026-05-18 22:00 跑的那次有 12 個主題」
  generated_run_id uuid,
  generated_at timestamptz,

  -- 審計欄位（紅線 B：FK 指 employees(id)）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ══════ Index ══════

CREATE INDEX rag_topic_queue_workspace_status_idx
  ON public.rag_topic_queue (workspace_id, status, occurrence_count DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX rag_topic_queue_run_idx
  ON public.rag_topic_queue (generated_run_id)
  WHERE generated_run_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX rag_topic_queue_deleted_at_idx
  ON public.rag_topic_queue (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS（紅線 #5、走 procedure）══════

CALL public.setup_workspace_scoped_rls('rag_topic_queue');

-- ══════ updated_at trigger ══════

CREATE TRIGGER rag_topic_queue_updated_at
  BEFORE UPDATE ON public.rag_topic_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments ══════

COMMENT ON TABLE public.rag_topic_queue IS
  'AI Hub 大型復盤產出的「RAG 待補主題清單」。聚合全 workspace 速記卡 unanswered_questions、給業務看「客人在問什麼答不出來」、用來建 RAG 知識庫。';
COMMENT ON COLUMN public.rag_topic_queue.generated_run_id IS
  '同一次復盤 run 的 topic 共用此 uuid、分組顯示 / 比對不同 run 的演進';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS rag_topic_queue_updated_at ON public.rag_topic_queue;
-- DROP TABLE IF EXISTS public.rag_topic_queue CASCADE;
-- COMMIT;
