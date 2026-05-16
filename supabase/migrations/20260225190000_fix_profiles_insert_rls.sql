-- Fix: profiles INSERT policy 太嚴格，導致新用戶建立時 trigger 被 RLS 擋住
-- 原本要求 workspace_id 匹配，但新用戶建立時還沒有 workspace
-- 改為允許所有 INSERT（SELECT/UPDATE/DELETE 仍有 workspace 隔離）
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (true);
