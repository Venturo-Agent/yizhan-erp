-- ============================================================
-- 2026-05-02 ERP 重構 Day 2：再砍 2 個高引用但全死的表
--
-- 篩選依據：n_live_tup = 0 且全部 src 引用都不是 from(...) query
--
-- payments      → 0 query、payment_requests 才是真正的請款表
-- activities    → 0 query、所有引用都是 type / health-check 字串
-- ============================================================

DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
