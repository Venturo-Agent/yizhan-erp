-- ─────────────────────────────────────────────────────────────────────────────
-- P1：inbox_messages 補 related_order_id（統一對話資料層遷移）
--
-- 寫於：2026-05-29（統一對話資料層 spec P1）
-- 對應：workspace/架構整理/2026-05-29-統一對話資料層-spec.md §3 §4
--
-- Why:
--   LINE bot 建單後會在對話訊息上反向標記是哪張單（line_conversation_messages.
--   related_order_id）。統一收件匣 inbox_messages 目前沒這欄、dual-write
--   (erp-bridge.ts recordInboxMessage) 會把這個連結弄丟。
--   P2 寫入收斂 / 退役舊表前，inbox_messages 必須先有對等欄位、否則斷連結。
--
-- 決策（William 2026-05-29 拍板）：用獨立欄位 related_order_id，不塞 metadata jsonb。
--   → 乾淨、好查、之後接報表方便。
--
-- 對映：line_conversation_messages.related_order_id (UUID) → 同名同型。
--   mirror 來源：無 FK、nullable（沿用舊表設計、不在遷移中引入新耦合 / cascade 風險）。
--
-- 紀律：
--   - ADD COLUMN IF NOT EXISTS、idempotent、可重跑
--   - 不動 RLS（既有 inbox_messages policy 不受新欄位影響、仍過 workspace_id）
--   - 動 column 後 NOTIFY pgrst reload schema
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS related_order_id UUID;

COMMENT ON COLUMN public.inbox_messages.related_order_id IS
  'LINE bot 建單後的反向連結（對映舊 line_conversation_messages.related_order_id）。'
  'nullable、無 FK、沿用來源設計。P2 寫入收斂後由 inbox-service 帶入';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一要回退、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.inbox_messages DROP COLUMN IF EXISTS related_order_id;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
