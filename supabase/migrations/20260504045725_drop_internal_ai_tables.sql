-- ============================================================================
-- 砍掉內部 AI 相關表（補 drop_chatbot_legacy 沒涵蓋的）
-- ============================================================================
-- 背景：
--   2026-05-04 William 拍板「AI 全撤、之後重新換寫整理」。
--   先前 20260504071146_drop_chatbot_legacy.sql 砍 LINE/Meta 客服那 8 張，
--   但漏掉內部 AI 相關 3 張：ai_settings / ai_memories / knowledge_base。
--
-- 處理範圍（這支補上）：
--   - ai_settings：per-workspace AI 參數設定（API key / 模型 / 額度）
--   - ai_memories：早期 AI assistant 對話記憶（程式已不引用）
--   - knowledge_base：原為 AI 客服 FAQ/Q&A、UI 沒人用
--
-- 紅線 0：destructive migration 放 _pending_review/、由 William 拍板再 apply。
--   apply 流程：mv ../_pending_review/20260504_drop_internal_ai_tables.sql
--                 ../20260504080000_drop_internal_ai_tables.sql
--               然後 npm run db:migrate
--
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.ai_settings CASCADE;
DROP TABLE IF EXISTS public.ai_memories CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;

COMMIT;

-- ============================================================================
-- 驗證查詢（apply 後跑一次確認）
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema='public'
--    AND table_name IN ('ai_settings','ai_memories','knowledge_base');
-- 預期：0 rows
