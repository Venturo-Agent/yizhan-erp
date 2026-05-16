-- 2026-04-23: 砍 employee_route_overrides（SSOT 統整、與 employee_permission_overrides 重複）
-- 0 row、0 src 引用（除 generated types）、0 entity re-export
-- 理由：route 是 derived from permission（URL ↔ module-tab 一對一）、不需要獨立表
BEGIN;
DROP TABLE IF EXISTS public.employee_route_overrides CASCADE;
COMMIT;
