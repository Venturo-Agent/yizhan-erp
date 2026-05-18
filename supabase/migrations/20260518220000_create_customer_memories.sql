-- ════════════════════════════════════════════════════════════════════
-- customer_memories — AI 客戶速記卡（rolling summary memory）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建這張表：
--   AI 跟 LINE / FB / IG 客戶聊天時、目前只看「最近 10 則訊息」（ai-brain.ts MAX_HISTORY_MESSAGES）。
--   客人 50 則前說「不吃螃蟹」、後面再聊 AI 完全忘了。
--   業界主流解法 = rolling summary：
--     - 短期記憶 = 最近 N 則原文
--     - 長期記憶 = AI 自己回看 → 寫一張結構化速記卡 → 下次塞進 system prompt
--
-- 觸發頻率：每對話累積 20 則訊息（inbound + outbound 都算）→ 自動 fire-and-forget LLM job 重寫速記卡
-- 摘要策略：重生（不疊加、避免漂移錯誤）
-- 範圍：以 conversation_id 為單位（一個對話一張卡）、綁定 ERP customer 後可帶過去
--
-- 6 層 SOP（Logan-Workspace/2026-05-13-建表-SOP.md）走法：
--   L1 Feature Gate    → ai_hub（既有、不新增）
--   L2 Capability      → ai_hub.read / ai_hub.write（既有、不新增）
--   L3 三維 Org Scope  → N/A（速記卡跟 conversation 同 workspace、全 ai_hub 員工可見）
--   L4 狀態守門        → N/A（沒鎖定狀態）
--   L5 RLS             → setup_workspace_scoped_rls
--   L6 防呆 SSOT       → created_by/updated_by FK 指 employees(id)（紅線 B）
--
-- 失敗保護：failed_attempts >= 3 暫停、避免無限重試燒 LLM。

BEGIN;

CREATE TABLE public.customer_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 對話歸屬（一對一、conversation 刪了速記卡跟著刪）
  conversation_id uuid NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,

  -- ERP 客戶綁定後填、跨多個 LINE/FB/IG 帳號合併用（未綁時為 null）
  -- customers.id 是 text 不是 uuid、跟 inbox_conversations.customer_id 對齊
  customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,

  -- 速記卡內容（AI LLM 寫入、結構化 JSON）
  -- 預期 keys：persona / preferences / history / unanswered_questions / summary_text
  -- summary_text 是給 AI 看的「人話版」、會塞進 system prompt
  memory_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 摘要進度追蹤（觸發判斷 + 並發保護）
  -- 上次摘要時對話累積到第幾則、用於 (current_count - last) >= 20 判斷
  last_summarized_message_count integer NOT NULL DEFAULT 0,
  last_summarized_at timestamptz,

  -- LLM 失敗連續計數、達 3 次暫停（待人工點「立刻重生」清零）
  failed_attempts integer NOT NULL DEFAULT 0,
  last_error text,

  -- 審計欄位（紅線 B：FK 指 employees(id)、不是 auth.users(id)）
  -- 系統自動摘要時 created_by/updated_by 為 null（沒人「建」、AI 寫）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ══════ Index ══════

-- 一個對話一張卡（軟刪後可重建）
CREATE UNIQUE INDEX customer_memories_conversation_unique
  ON public.customer_memories (conversation_id)
  WHERE deleted_at IS NULL;

-- workspace 內列出（業務後台會列）
CREATE INDEX customer_memories_workspace_updated_idx
  ON public.customer_memories (workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- 綁定 ERP 客戶後反查（多 LINE 帳號合併同客人）
CREATE INDEX customer_memories_customer_idx
  ON public.customer_memories (customer_id)
  WHERE customer_id IS NOT NULL AND deleted_at IS NULL;

-- 軟刪 housekeeping
CREATE INDEX customer_memories_deleted_at_idx
  ON public.customer_memories (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS（走 procedure、不散刻、紅線 #5）══════

CALL public.setup_workspace_scoped_rls('customer_memories');

-- ══════ updated_at trigger ══════

CREATE TRIGGER customer_memories_updated_at
  BEFORE UPDATE ON public.customer_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments（給未來人讀懂用途）══════

COMMENT ON TABLE public.customer_memories IS
  'AI 客戶速記卡（rolling summary memory）。每對話一張、AI 每 20 則訊息自動重生、用於長期記憶注入 system prompt。';
COMMENT ON COLUMN public.customer_memories.memory_json IS
  '結構化速記卡：{ persona, preferences, history, unanswered_questions, summary_text }';
COMMENT ON COLUMN public.customer_memories.last_summarized_message_count IS
  '上次摘要時對話累積訊息數、用於計算「該不該再觸發」（current - last >= 20）';
COMMENT ON COLUMN public.customer_memories.failed_attempts IS
  'LLM 失敗連續計數。達 3 次暫停、人工點重生清零、避免無限重試燒錢。';

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TRIGGER IF EXISTS customer_memories_updated_at ON public.customer_memories;
-- DROP TABLE IF EXISTS public.customer_memories CASCADE;
-- COMMIT;
