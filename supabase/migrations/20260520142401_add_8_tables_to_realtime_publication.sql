-- ============================================================================
-- 為什麼這支 migration
-- ============================================================================
-- 對應 AUDIT_SWR_REALTIME.md「M1：8 個 entity 訂閱了 Realtime 但 publication 沒開」段
--
-- 症狀（白話）：
--   React 端的 entity hook 寫了「請通知我變動」、但 DB 端 supabase_realtime
--   publication 沒收這 8 張表 — 永遠收不到 postgres_changes broadcast、
--   UI 永遠顯示 stale、要 F5 才更新（靜默失效、log 也沒錯）。
--
-- 量測證據（2026-05-20 scripts/audit-realtime.ts）：
--   - 41 個 entity hook 訂閱 Realtime
--   - 35 張表已在 supabase_realtime publication
--   - 差集 = 下列 8 張表
--
-- 本次補齊的 8 張表：
--   - application_service_types
--   - chart_of_accounts
--   - customer_document_applications
--   - customer_documents
--   - document_types
--   - payment_request_items
--   - supplier_pricing
--   - workspace_bonus_defaults
--
-- 設計原則：
--   - 每張表 idempotent：先查 pg_publication_tables、不在才 ADD
--   - 重跑安全、不會撞「relation is already member of publication」錯誤
--   - 包在 BEGIN / COMMIT 內、單一交易、失敗整體 rollback
--
-- 風險評估：
--   - 加 publication 屬潛在破壞性（broadcast 流量會上升、egress 費用 +）
--     但這 8 張表本來就是「應該要 broadcast」的對話 / 應用 / 字典型資料、
--     量級可控、修補的是「該廣播沒廣播」的 bug、不是新加廣播
--   - RLS 不受影響（publication 只控廣播 channel、RLS 仍然守 row 可見度）
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'application_service_types'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.application_service_types;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'chart_of_accounts'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chart_of_accounts;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'customer_document_applications'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_document_applications;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'customer_documents'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_documents;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'document_types'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_types;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'payment_request_items'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_request_items;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'supplier_pricing'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_pricing;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'workspace_bonus_defaults'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_bonus_defaults;
  END IF;
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.application_service_types;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.chart_of_accounts;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_document_applications;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_documents;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.document_types;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.payment_request_items;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.supplier_pricing;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.workspace_bonus_defaults;
-- COMMIT;
