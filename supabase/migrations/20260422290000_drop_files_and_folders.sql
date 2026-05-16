-- 2026-04-22: 砍檔案系統整族（William 決策、之後整合到旅遊團、不獨立）
-- folders 576 row + files 1 row 已 export 到 docs/PRE_LAUNCH_CLEANUP/exports/
BEGIN;
DROP TABLE IF EXISTS public.file_audit_logs CASCADE;
DROP TABLE IF EXISTS public.file_history CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
COMMIT;
