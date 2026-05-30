-- ════════════════════════════════════════════════════════════════════════════
-- AI 知識缺口記錄表 ai_knowledge_gaps（2026-05-28 William 拍板）
--
-- 為什麼：
--   SaaS 哲學「白痴起點」—— 新租戶開通 AI 都是白痴、漫途賣的是「把白痴變聰明
--   的工具流」。第一步是 AI 在「沒料而轉接顧問」時、必須留下「客戶問了什麼」
--   的記錄、業務之後 review 補料。沒這張表 = 訓練機會隨對話蒸發。
--
-- 寫入路徑：唯一 LLM tool record_knowledge_gap（src/lib/ai/tools/record-knowledge-gap.ts）
--   AI 在 composeReply 偵測「料庫沒這項 → 接顧問」場景時、自動 call 此 tool 寫入。
--   不在 DB 加 trigger 雙寫（紅線 E）、API code 是唯一寫入點。
--
-- 紅線對照：
--   #B  審計欄位（reviewed_by / created_by）FK 指 employees、不指 auth.users
--   #E  寫入唯一入口（API tool、無 trigger 雙寫）
--   #H  業務表 RLS 過 workspace_id（走 setup_workspace_scoped_rls procedure、不散刻）
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_knowledge_gaps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 來源對話脈絡（link 回原 inbox_conversations、給業務 review 看上下文）
  conversation_id     uuid REFERENCES public.inbox_conversations(id) ON DELETE SET NULL,
  -- 客戶識別（line_user_id 或其他 channel 的 external_user_id；可能帶 group:/room: 前綴）
  external_user_id    text,
  customer_name       text,

  -- 核心內容（AI tool 寫入時必填）
  question_text       text NOT NULL,                       -- 客戶原話
  topic_hint          text,                                -- AI 自標主題（譬如「日本北海道景點」「沙烏地簽證」）
  ai_response         text,                                -- AI 怎麼回的（給 review 對照、看回應品質）

  -- Review 狀態機
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'trained', 'declined', 'duplicated')),
  notes               text,                                -- 業務 review 寫補充說明
  reviewed_by         uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,

  -- audit（created_by NULL 表示 AI 自動寫入；employee 手動補登時填）
  created_by          uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 列表查詢用（最常見：依 workspace + status filter、時間倒序）
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_ws_status
  ON public.ai_knowledge_gaps (workspace_id, status, created_at DESC);

-- 對話脈絡 lookup（從 conversation 查相關 gap）
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_conversation
  ON public.ai_knowledge_gaps (conversation_id)
  WHERE conversation_id IS NOT NULL;

-- 同主題聚合（找 topic_hint 重複的、未來 review 時自動 dedup）
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_topic
  ON public.ai_knowledge_gaps (workspace_id, topic_hint)
  WHERE topic_hint IS NOT NULL;

-- updated_at 自動更新 trigger
CREATE OR REPLACE FUNCTION public.set_ai_knowledge_gaps_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_knowledge_gaps_updated_at ON public.ai_knowledge_gaps;
CREATE TRIGGER trg_ai_knowledge_gaps_updated_at
  BEFORE UPDATE ON public.ai_knowledge_gaps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_knowledge_gaps_updated_at();

-- RLS：workspace 隔離（業務表必過 workspace_id、紅線 H）。走標準 procedure、不散刻。
CALL public.setup_workspace_scoped_rls('ai_knowledge_gaps');

COMMENT ON TABLE public.ai_knowledge_gaps IS
  'AI 知識缺口記錄。AI 在「沒料而轉接顧問」時、必 call record_knowledge_gap tool 寫一筆。給業務 review 補料的清單。2026-05-28 William 拍板「白痴起點 + 訓練飛輪」。';
COMMENT ON COLUMN public.ai_knowledge_gaps.status IS
  'pending=待 review、trained=已補進 KB、declined=不採納（譬如垃圾訊息）、duplicated=已合併到既有主題';
COMMENT ON COLUMN public.ai_knowledge_gaps.created_by IS
  'NULL = AI 自動寫入（tool call）；employee = 手動補登。FK→employees、紅線 B。';

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_ai_knowledge_gaps_updated_at ON public.ai_knowledge_gaps;
-- DROP FUNCTION IF EXISTS public.set_ai_knowledge_gaps_updated_at();
-- DROP TABLE IF EXISTS public.ai_knowledge_gaps;
-- COMMIT;
