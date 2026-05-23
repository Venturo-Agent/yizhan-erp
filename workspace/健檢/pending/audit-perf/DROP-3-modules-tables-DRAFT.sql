-- ════════════════════════════════════════════════════════════════════════════
-- 徹底刪 3 模組 — documents / visas / esim
-- ════════════════════════════════════════════════════════════════════════════
--
-- 2026-05-23 William 拍 A：code 全砍 + DB 也 drop。
-- source code 已砍（commit 中、type-check 過）。
-- 本 SQL = DRAFT、**等 William 簽字確認 table 清單後**、才放 supabase/migrations/ + apply。
--
-- 不可逆：DROP TABLE 砍了資料就沒了、即使現在表空也回不來。
-- William 看完清單、回「OK 全砍」或「保留 X 表」、再執行。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 文件中心模組 (documents)
-- ──────────────────────────────────────────────────────────────────────────
-- 對應砍的 entity：workspace_documents / workspace_seals
DROP TABLE IF EXISTS public.workspace_documents CASCADE;
DROP TABLE IF EXISTS public.workspace_seals CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- eSIM 管理模組 (esim)
-- ──────────────────────────────────────────────────────────────────────────
-- 對應砍的 entity：worldmove_esim_items
-- 注意：worldmove_orders + worldmove integration 保留（跟 esim 模組不同、其他場景可能用）
DROP TABLE IF EXISTS public.worldmove_esim_items CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- 簽證代辦模組 (visas)
-- ──────────────────────────────────────────────────────────────────────────
-- 對應砍的 entity：customer_documents / customer_document_applications / document_types
--                   application_service_types / supplier_pricing
-- 還有 migration 抓到的 visa table:
DROP TABLE IF EXISTS public.supplier_pricing CASCADE;
DROP TABLE IF EXISTS public.customer_document_applications CASCADE;
DROP TABLE IF EXISTS public.customer_documents CASCADE;
DROP TABLE IF EXISTS public.application_service_types CASCADE;
DROP TABLE IF EXISTS public.document_types CASCADE;
DROP TABLE IF EXISTS public.usa_esta CASCADE;
DROP TABLE IF EXISTS public.visas CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- workspace_features / role_capabilities seed 清理（capability + feature 都砍）
-- ──────────────────────────────────────────────────────────────────────────
DELETE FROM public.workspace_features
WHERE feature_code IN ('documents', 'esim', 'visas');

DELETE FROM public.role_capabilities
WHERE capability_code LIKE 'documents.%'
   OR capability_code LIKE 'esim.%'
   OR capability_code LIKE 'visas.%';

DELETE FROM public.capabilities
WHERE code LIKE 'documents.%'
   OR code LIKE 'esim.%'
   OR code LIKE 'visas.%';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════════════════
--
-- 砍 table 沒救（要 Supabase backup restore、或重新 migration build）
-- 紅旗：DROP TABLE 後 24 小時內、Supabase Pro plan PITR 可以救（要花錢）
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 不在這份清單裡的 table（保留、跟 3 模組無關 / 跨模組用）：
-- ════════════════════════════════════════════════════════════════════════════
-- - worldmove_orders（worldmove integration、跟 esim 模組不同、保留）
-- - 任何 migration 提到 'document' / 'visa' / 'esim' 但不屬於這 3 模組的（如 tour_documents / office_documents）
--
-- 若 William 想連 worldmove_orders / worldmove integration 也砍、單獨講、不在這份。
-- ════════════════════════════════════════════════════════════════════════════
