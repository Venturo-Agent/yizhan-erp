-- ============================================================
-- 2026-05-01 ERP 重構清場：DROP 16 個孤兒表
--
-- 篩選依據：n_live_tup = 0 + src/ 0~1 個引用 + 非真實業務寫入點
-- 詳細審查見 conversation log。
--
-- 三組：
--   🟢 完全孤兒（0 src 引用）
--   🟡 src 引用為純常數列表 / type 殘留（不是真實 query）
--   🟠 重複命名（被同義新表取代）
-- ============================================================

-- 🟢 完全孤兒
DROP TABLE IF EXISTS public.brand_questionnaires CASCADE;
DROP TABLE IF EXISTS public.erp_bank_accounts CASCADE;
DROP TABLE IF EXISTS public.itinerary_documents CASCADE;
DROP TABLE IF EXISTS public.itinerary_versions CASCADE;
DROP TABLE IF EXISTS public.pnr_passengers CASCADE;
DROP TABLE IF EXISTS public.pnr_remarks CASCADE;
DROP TABLE IF EXISTS public.pnr_segments CASCADE;
DROP TABLE IF EXISTS public.pnr_ssr_elements CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.tour_tables CASCADE;

-- 🟡 src 引用是常數列表 / 死字串
DROP TABLE IF EXISTS public.body_measurements CASCADE;
DROP TABLE IF EXISTS public.progress_photos CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.workspace_items CASCADE;

-- 🟠 重複命名（同義表已取代）
--   accounts        → chart_of_accounts / accounting_subjects 才是活的
--   categories      → expense_categories / accounting_categories 才是活的
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
