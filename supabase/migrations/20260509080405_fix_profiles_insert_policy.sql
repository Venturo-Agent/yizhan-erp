-- =============================================================================
-- Fix: profiles_insert WITH CHECK true → 限 user 只能 insert 自己的 profile
-- 對應 SECURITY_AUDIT.md §10 #1（高風險）
-- =============================================================================
--
-- 問題：profiles_insert WITH CHECK true 允許任何 authenticated user 插入
-- 任意 workspace_id 的 profile row。advisor 標 rls_policy_always_true。
--
-- 修法：WITH CHECK (auth.uid() = id)、user 只能 insert 自己的 row。
-- 這是純改 policy、不動資料、不動 schema。
-- =============================================================================

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "profiles_insert" ON public.profiles IS
  'user 只能 insert 自己 auth.uid() 對應的 profile row、不准跨 user / 跨 workspace 寫入';
