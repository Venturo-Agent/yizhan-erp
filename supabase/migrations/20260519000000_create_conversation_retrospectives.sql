-- ════════════════════════════════════════════════════════════════════
-- conversation_retrospectives — 1-對-1 + 群組對話復盤歷史
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   現有 /api/messaging/conversations/[id]/retrospective 跑完只回 modal、
--   關掉就消失、沒地方查歷史。1-對-1 和群組都該存。
--
--   William 2026-05-19 拍板：每按一次「復盤」存一筆、可看歷史 / 比較演進 /
--   加業務補充說明 / 標已採取行動。1-對-1 跟群組共用此表（用 conversation_id
--   區分、type 標 'customer' / 'group'）。
--
-- 跟現有 customer_memories（速記卡）的差異：
--   customer_memories：AI 短期記憶、runtime 塞 system prompt 用、每 50 則
--                      自動重寫（覆蓋）、一個對話一張卡
--   conversation_retrospectives：人看的對話摘要、手動觸發、保留歷史、
--                                一個對話多筆（按一次存一筆）
--
-- 6 層 SOP：
--   L1 Feature Gate → ai_hub
--   L2 Capability   → ai_hub.read（看清單）/ ai_hub.write（產 / 標狀態）
--   L3 三維 Scope   → N/A（workspace 內全員可見）
--   L4 狀態守門     → status check constraint
--   L5 RLS          → setup_workspace_scoped_rls
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)

BEGIN;

CREATE TABLE public.conversation_retrospectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 對話歸屬（1-對-1 / 群組都同一張表）
  conversation_id uuid NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,

  -- 對話類型（純標記、給 UI 過濾用、derive 自 inbox_conversations.external_user_id）
  conversation_type text NOT NULL DEFAULT 'customer'
    CHECK (conversation_type IN ('customer', 'group', 'room')),

  -- LLM 產出的復盤摘要（人話、markdown 容許）
  summary_text text NOT NULL,

  -- 業務補充 / 行動結論（人手寫）
  notes text,

  -- 狀態：pending（剛產、待 review）/ reviewed（看過了）/ actioned（已採取行動）/ archived（封存）
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'archived')),

  -- 復盤時、原對話累積到第幾則訊息（給「上次復盤後又聊了 N 則」的演進感）
  message_count_at_generation integer NOT NULL DEFAULT 0,

  -- 是哪個員工點的「復盤」（手動觸發者、給歷史 trace）
  generated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,

  -- 審計欄位（紅線 B：FK 指 employees(id)）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ══════ Index ══════

-- 列某對話的所有復盤（時間倒序、最新在上）
CREATE INDEX conversation_retrospectives_conv_created_idx
  ON public.conversation_retrospectives (conversation_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- workspace 全列表（給 AI Hub 復盤 tab 用）
CREATE INDEX conversation_retrospectives_workspace_status_idx
  ON public.conversation_retrospectives (workspace_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX conversation_retrospectives_deleted_at_idx
  ON public.conversation_retrospectives (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS ══════

CALL public.setup_workspace_scoped_rls('conversation_retrospectives');

-- ══════ updated_at trigger ══════

CREATE TRIGGER conversation_retrospectives_updated_at
  BEFORE UPDATE ON public.conversation_retrospectives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments ══════

COMMENT ON TABLE public.conversation_retrospectives IS
  '1-對-1 + 群組對話復盤歷史。每次手動按「復盤」存一筆、保留演進、可加業務 note。跟 customer_memories（AI 短期記憶）分工：speed card = runtime 用、retrospective = 人看用。';
COMMENT ON COLUMN public.conversation_retrospectives.conversation_type IS
  'derive 自 inbox_conversations 的 external_user_id 前綴：group: → group、room: → room、其他 → customer';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS conversation_retrospectives_updated_at ON public.conversation_retrospectives;
-- DROP TABLE IF EXISTS public.conversation_retrospectives CASCADE;
-- COMMIT;
