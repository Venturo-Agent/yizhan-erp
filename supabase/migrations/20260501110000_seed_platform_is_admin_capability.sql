-- ============================================================
-- 權限重構 Step 4 (2026-05-01)
-- 加 'platform.is_admin' capability、給 workspace_roles.is_admin=true 的角色
--
-- 用途：取代 useAuthStore.isAdmin 後門、所有 callsite 改 query has('platform.is_admin')。
-- 語意：「這個 role 是 workspace 的系統主管」、跟 workspace_roles.is_admin 一一對應。
-- ============================================================

INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT
  id,
  'platform.is_admin',
  true
FROM public.workspace_roles
WHERE is_admin = true
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;
