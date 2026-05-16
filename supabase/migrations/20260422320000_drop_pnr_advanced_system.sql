-- 2026-04-22: 砍 PNR 進階系統 11 張（保留 PnrMatchDialog 工具 + order_members.pnr 簡單版）
-- pnrs 1 row 已 export 到 docs/PRE_LAUNCH_CLEANUP/exports/pnrs_2026-04-22_export.json
-- 其他 10 張全 0 row
BEGIN;
DROP TABLE IF EXISTS public.pnr_ssr_elements CASCADE;
DROP TABLE IF EXISTS public.pnr_remarks CASCADE;
DROP TABLE IF EXISTS public.pnr_segments CASCADE;
DROP TABLE IF EXISTS public.pnr_passengers CASCADE;
DROP TABLE IF EXISTS public.pnr_ai_queries CASCADE;
DROP TABLE IF EXISTS public.pnr_fare_alerts CASCADE;
DROP TABLE IF EXISTS public.pnr_fare_history CASCADE;
DROP TABLE IF EXISTS public.pnr_flight_status_history CASCADE;
DROP TABLE IF EXISTS public.pnr_queue_items CASCADE;
DROP TABLE IF EXISTS public.pnr_records CASCADE;
DROP TABLE IF EXISTS public.pnrs CASCADE;
COMMIT;
