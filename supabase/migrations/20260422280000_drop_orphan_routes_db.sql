-- 2026-04-22: 砍 11 個孤兒路由相關 DB（William 決策、上線不需要、之後重新開發）
-- esims 91 row 已 export 到 docs/PRE_LAUNCH_CLEANUP/exports/esims_2026-04-22_export.json
BEGIN;
DROP TABLE IF EXISTS public.esims CASCADE;
DROP TABLE IF EXISTS public.office_documents CASCADE;
DROP TABLE IF EXISTS public.brochure_versions CASCADE;
DROP TABLE IF EXISTS public.brochure_documents CASCADE;
COMMIT;
