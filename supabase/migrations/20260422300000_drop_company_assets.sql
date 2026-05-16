-- 2026-04-22: 砍 company_assets（William 決策、跟檔案系統一起砍）
-- 19 row + 1 folder 已 export 到 docs/PRE_LAUNCH_CLEANUP/exports/company_assets_2026-04-22_export.json
BEGIN;
DROP TABLE IF EXISTS public.company_assets CASCADE;
DROP TABLE IF EXISTS public.company_asset_folders CASCADE;
COMMIT;
