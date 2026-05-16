-- ============================================================
-- 權限重構 Step 4 (2026-05-01)
-- DROP role_tab_permissions 表（已被 role_capabilities 取代、application code 全部改完）
-- ============================================================

DROP TABLE IF EXISTS public.role_tab_permissions CASCADE;
